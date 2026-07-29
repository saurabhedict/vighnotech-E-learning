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
  // Try to deliver the code to the user's real inbox/phone. `delivered` = it went
  // out via a configured provider; false = the provider is unconfigured OR the send
  // failed (bad creds, host blocks outbound SMTP, timeout…). Callers surface the
  // code as a fallback ONLY when it was NOT delivered (non-prod) — so a working
  // provider means the user gets the code in their inbox and types it in. The
  // transport timeouts in mailer.js bound how long a broken provider can stall this.
  let delivered = false
  try {
    if (channel === 'sms') {
      await sendSms(dest, `Your ${env.app.name} verification code is ${code}. It expires in ${env.otp.ttlMin} min.`)
      delivered = env.sms.configured
    } else if (channel === 'whatsapp') {
      await sendWhatsApp(dest, `Your ${env.app.name} verification code is *${code}*. It expires in ${env.otp.ttlMin} min.`)
      delivered = env.sms.configured
    } else {
      await sendMail(otpEmail(dest, code, purpose))
      delivered = env.email.configured
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[otp] ${channel} delivery failed: ${err?.message}`)
    if (env.isProd) throw err // production must not silently drop the code
    delivered = false
  }
  return { code, delivered }
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
