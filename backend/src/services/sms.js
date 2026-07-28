import { env } from '../config/env.js'

/**
 * SMS + WhatsApp sender via Twilio. If Twilio isn't configured, falls back to
 * logging to the server console so SMS/WhatsApp OTP flows work in development
 * with zero credentials. Set TWILIO_* env vars to send real messages.
 */
let client

async function getClient() {
  if (client !== undefined) return client
  if (env.sms.configured) {
    const { default: twilio } = await import('twilio')
    client = twilio(env.sms.accountSid, env.sms.authToken)
  } else {
    client = null // dev console fallback
  }
  return client
}

function devLog(kind, to, body) {
  // eslint-disable-next-line no-console
  console.log(
    `\n──────── [${kind}:DEV — Twilio not configured] ────────\n` +
      `To:   ${to}\n${body}\n` +
      `────────────────────────────────────────────────────\n`
  )
}

// Normalize a phone to E.164-ish (strip spaces/dashes; keep leading +).
export function normalizePhone(p) {
  return String(p || '').replace(/[^\d+]/g, '')
}

// Turn a Twilio SDK error into a clean, client-friendly ApiError (400).
function twilioError(e) {
  const desc = e?.code === 20003 ? 'Twilio authentication failed — check TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN' : e?.message || 'SMS send failed'
  const err = new Error(`SMS: ${desc}`)
  err.status = 400
  return err
}

export async function sendSms(to, body) {
  const c = await getClient()
  const dest = normalizePhone(to)
  if (!c) return devLog('SMS', dest, body)
  if (!env.sms.smsFrom) {
    const e = new Error('SMS: TWILIO_SMS_FROM (your Twilio number) is not set')
    e.status = 400
    throw e
  }
  try {
    return await c.messages.create({ from: env.sms.smsFrom, to: dest, body })
  } catch (e) {
    throw twilioError(e)
  }
}

export async function sendWhatsApp(to, body) {
  const c = await getClient()
  const dest = `whatsapp:${normalizePhone(to)}`
  if (!c) return devLog('WhatsApp', dest, body)
  try {
    return await c.messages.create({ from: env.sms.whatsappFrom, to: dest, body })
  } catch (e) {
    throw twilioError(e)
  }
}
