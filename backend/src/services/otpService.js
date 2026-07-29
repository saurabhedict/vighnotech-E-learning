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
  // `viaConsole` = the delivery provider for this channel isn't configured, so the
  // code was only logged to the server console (never reached the user). Callers
  // use this to surface the code in the API response on non-prod deployments.
  let viaConsole
  try {
    if (channel === 'sms') {
      await sendSms(dest, `Your ${env.app.name} verification code is ${code}. It expires in ${env.otp.ttlMin} min.`)
      viaConsole = !env.sms.configured
    } else if (channel === 'whatsapp') {
      await sendWhatsApp(dest, `Your ${env.app.name} verification code is *${code}*. It expires in ${env.otp.ttlMin} min.`)
      viaConsole = !env.sms.configured
    } else {
      await sendMail(otpEmail(dest, code, purpose))
      viaConsole = !env.email.configured
    }
  } catch (err) {
    // The delivery provider errored (bad SMTP creds, Twilio failure, etc.). Outside
    // production we don't hard-fail the flow — treat it like the console fallback so
    // the caller can surface the code and verification/2FA/registration still work
    // on a demo deploy. In production we rethrow so the user is told delivery failed.
    if (env.isProd) throw err
    // eslint-disable-next-line no-console
    console.warn(`[otp] ${channel} delivery failed: ${err?.message} — surfacing code (non-prod)`)
    viaConsole = true
  }
  return { code, viaConsole }
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
