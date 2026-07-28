import bcrypt from 'bcryptjs'
import { customAlphabet } from 'nanoid'
import { Otp } from '../models/Otp.js'
import { env } from '../config/env.js'
import { sendMail, otpEmail } from './mailer.js'
import { sendSms, sendWhatsApp } from './sms.js'

const genCode = () => customAlphabet('0123456789', env.otp.length)()

/**
 * Issue an OTP for a purpose over a channel (email | sms | whatsapp).
 * Invalidates any prior unconsumed OTP for the same identity+purpose, stores the
 * new one hashed, and delivers it via the chosen channel (or logs it in dev).
 * The plaintext code is never returned or persisted.
 */
export async function issueOtp({ email, userId, purpose, channel = 'email', to }) {
  const code = genCode()
  const codeHash = await bcrypt.hash(code, 10)
  const expiresAt = new Date(Date.now() + env.otp.ttlMin * 60_000)

  const identity = userId ? { userId } : { email }
  await Otp.updateMany({ ...identity, purpose, consumedAt: null }, { $set: { consumedAt: new Date() } })
  await Otp.create({ ...identity, email: email || undefined, purpose, channel, codeHash, expiresAt })

  const dest = to || email
  if (channel === 'sms') {
    await sendSms(dest, `Your ${env.app.name} verification code is ${code}. It expires in ${env.otp.ttlMin} min.`)
  } else if (channel === 'whatsapp') {
    await sendWhatsApp(dest, `Your ${env.app.name} verification code is *${code}*. It expires in ${env.otp.ttlMin} min.`)
  } else {
    await sendMail(otpEmail(dest, code, purpose))
  }
}

/**
 * Verify an OTP. Returns { ok, reason }. Consumes the OTP on success; counts
 * attempts and rejects past the cap.
 */
export async function verifyOtp({ email, userId, purpose, code }) {
  const identity = userId ? { userId } : { email }
  const otp = await Otp.findOne({ ...identity, purpose, consumedAt: null }).sort({ createdAt: -1 })
  if (!otp) return { ok: false, reason: 'not_found' }
  if (otp.expiresAt < new Date()) return { ok: false, reason: 'expired' }
  if (otp.attempts >= env.otp.maxAttempts) return { ok: false, reason: 'too_many_attempts' }

  const match = await bcrypt.compare(String(code), otp.codeHash)
  if (!match) {
    otp.attempts += 1
    // Kill the OTP once the attempt cap is hit so it can't be retried at all.
    const locked = otp.attempts >= env.otp.maxAttempts
    if (locked) otp.consumedAt = new Date()
    await otp.save()
    return { ok: false, reason: locked ? 'too_many_attempts' : 'invalid' }
  }
  otp.consumedAt = new Date()
  await otp.save()
  return { ok: true, channel: otp.channel }
}
