import nodemailer from 'nodemailer'
import { env } from '../config/env.js'

/**
 * Email sender (Nodemailer over generic SMTP). If SMTP isn't configured, falls
 * back to logging the message to the server console so OTP/verification flows
 * work in development with zero credentials. Swap nothing to go live — just set
 * SMTP_* env vars.
 */
let transport

function getTransport() {
  if (transport !== undefined) return transport
  if (env.email.configured) {
    transport = nodemailer.createTransport({
      host: env.email.host,
      port: env.email.port,
      secure: env.email.port === 465, // 465 = implicit TLS, else STARTTLS
      auth: { user: env.email.user, pass: env.email.pass },
    })
  } else {
    transport = null // dev console fallback
  }
  return transport
}

export async function sendMail({ to, subject, text, html }) {
  const t = getTransport()
  if (!t) {
    // eslint-disable-next-line no-console
    console.log(
      `\n──────── [mailer:DEV — no SMTP configured] ────────\n` +
        `To:      ${to}\nSubject: ${subject}\n\n${text || stripHtml(html)}\n` +
        `───────────────────────────────────────────────────\n`
    )
    return { dev: true }
  }
  return t.sendMail({ from: env.email.from, to, subject, text, html })
}

function stripHtml(html = '') {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

// ── Templates ────────────────────────────────────────────────────────────────
const PURPOSE_LABEL = {
  email_verify: 'verify your email address',
  password_reset: 'reset your password',
  login_2fa: 'complete your sign-in',
}

export function otpEmail(to, code, purpose) {
  const what = PURPOSE_LABEL[purpose] || 'continue'
  return {
    to,
    subject: `${env.app.name}: your verification code is ${code}`,
    text: `Your ${env.app.name} code to ${what} is: ${code}\nIt expires in ${env.otp.ttlMin} minutes. If you didn't request this, ignore this email.`,
    html: `<div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:480px">
      <h2 style="color:#b23a2e">${env.app.name}</h2>
      <p>Use this code to ${what}:</p>
      <p style="font-size:30px;font-weight:800;letter-spacing:6px;color:#1a0d0f">${code}</p>
      <p style="color:#666">Expires in ${env.otp.ttlMin} minutes. If you didn't request this, you can ignore this email.</p>
    </div>`,
  }
}

export function newDeviceEmail(to, { ip, ua, when }) {
  return {
    to,
    subject: `${env.app.name}: new sign-in to your account`,
    text: `A new sign-in to your ${env.app.name} account was detected.\nWhen: ${when}\nIP: ${ip}\nDevice: ${ua}\nIf this wasn't you, change your password immediately.`,
    html: `<div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:480px">
      <h2 style="color:#b23a2e">${env.app.name}</h2>
      <p>A <b>new sign-in</b> to your account was detected:</p>
      <ul><li>When: ${when}</li><li>IP: ${ip}</li><li>Device: ${ua}</li></ul>
      <p style="color:#b23a2e"><b>If this wasn't you</b>, change your password immediately.</p>
    </div>`,
  }
}

export function receiptEmail(to, { title, amount, licenseId, when }) {
  return {
    to,
    subject: `${env.app.name}: purchase receipt — ${title}`,
    text: `Thank you for your purchase on ${env.app.name}.\nItem: ${title}\nAmount: ₹${amount}\nLicense: ${licenseId}\nDate: ${when}`,
    html: `<div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:480px">
      <h2 style="color:#b23a2e">${env.app.name}</h2>
      <p>Thank you for your purchase!</p>
      <table style="border-collapse:collapse">
        <tr><td style="padding:4px 12px 4px 0;color:#666">Item</td><td><b>${title}</b></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666">Amount</td><td>₹${amount}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666">License</td><td style="font-family:monospace">${licenseId}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666">Date</td><td>${when}</td></tr>
      </table>
    </div>`,
  }
}
