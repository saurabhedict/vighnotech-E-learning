// Phase-A auth flow test: email verification, TOTP 2FA (+ backup code), and
// password reset. Run with OUTFILE=<backend console log> so email OTP codes can
// be read from the dev mailer output.
import fs from 'node:fs'
import otplib from 'otplib'
const { authenticator } = otplib

const BASE = process.env.BASE || 'http://localhost:4000'
const OUTFILE = process.env.OUTFILE
let pass = 0
const fails = []
const ok = (n, c, extra = '') => (c ? (pass++, console.log(`  ✓ ${n}`)) : (fails.push(n), console.log(`  ✗ ${n} ${extra}`)))
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function call(method, path, { token, body } = {}) {
  const headers = {}
  if (body) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
  let data = null
  try { data = await res.json() } catch { /* */ }
  return { status: res.status, data }
}

function latestCode() {
  if (!OUTFILE || !fs.existsSync(OUTFILE)) return null
  const txt = fs.readFileSync(OUTFILE, 'utf8')
  const matches = [...txt.matchAll(/code is (\d{4,8})/g)]
  return matches.length ? matches[matches.length - 1][1] : null
}

async function main() {
  const email = `auth_${Date.now()}@vigno.in`
  const pw = 'secret123'

  console.log('\n── Signup + email verification ──')
  const su = await call('POST', '/api/auth/signup', { body: { email, password: pw, name: 'Auth Test' } })
  ok('signup → token', su.status === 201 && !!su.data?.token)
  const token = su.data.token
  ok('email not yet verified', su.data?.user?.emailVerified === false)
  await wait(600) // signup sends the verify OTP fire-and-forget
  const vcode = latestCode()
  ok('verify OTP found in console log', !!vcode, OUTFILE ? '' : '(set OUTFILE)')
  const ve = await call('POST', '/api/auth/verify-email', { token, body: { code: vcode } })
  ok('verify-email → emailVerified true', ve.data?.user?.emailVerified === true)
  const veBad = await call('POST', '/api/auth/verify-email', { token, body: { code: '000000' } })
  ok('verify-email wrong code → 400', veBad.status === 400)

  console.log('\n── Enable TOTP 2FA ──')
  const setup = await call('POST', '/api/auth/2fa/totp/setup', { token })
  ok('setup returns secret + QR', !!setup.data?.secret && setup.data?.qr?.startsWith('data:image'))
  const secret = setup.data.secret
  const enable = await call('POST', '/api/auth/2fa/totp/enable', { token, body: { code: authenticator.generate(secret) } })
  ok('enable → 10 backup codes', enable.data?.ok === true && enable.data?.backupCodes?.length === 10)
  const backupCodes = enable.data.backupCodes

  console.log('\n── 2FA login (TOTP) ──')
  const l1 = await call('POST', '/api/auth/login', { body: { email, password: pw } })
  ok('login now requires 2FA', l1.data?.twoFARequired === true && l1.data?.method === 'totp' && !!l1.data?.challenge)
  ok('login did NOT issue a session token', !l1.data?.token)
  const v1 = await call('POST', '/api/auth/2fa/verify', { body: { challenge: l1.data.challenge, code: authenticator.generate(secret) } })
  ok('2fa/verify (TOTP) → session token', v1.status === 200 && !!v1.data?.token)
  const vBad = await call('POST', '/api/auth/2fa/verify', { body: { challenge: l1.data.challenge, code: '111111' } })
  ok('2fa/verify wrong code → 401', vBad.status === 401)

  console.log('\n── 2FA login (backup code) ──')
  const l2 = await call('POST', '/api/auth/login', { body: { email, password: pw } })
  const vb = await call('POST', '/api/auth/2fa/verify', { body: { challenge: l2.data.challenge, code: backupCodes[0] } })
  ok('backup code logs in', vb.status === 200 && !!vb.data?.token)
  const l3 = await call('POST', '/api/auth/login', { body: { email, password: pw } })
  const vbReuse = await call('POST', '/api/auth/2fa/verify', { body: { challenge: l3.data.challenge, code: backupCodes[0] } })
  ok('used backup code is rejected on reuse', vbReuse.status === 401)

  console.log('\n── Password reset ──')
  await call('POST', '/api/auth/forgot-password', { body: { email } })
  await wait(400)
  const rcode = latestCode()
  ok('reset OTP found in console log', !!rcode)
  const newPw = 'newsecret456'
  const rp = await call('POST', '/api/auth/reset-password', { body: { email, code: rcode, newPassword: newPw } })
  ok('reset-password → ok', rp.data?.ok === true)
  const oldLogin = await call('POST', '/api/auth/login', { body: { email, password: pw } })
  ok('old password rejected', oldLogin.status === 401)
  const newLogin = await call('POST', '/api/auth/login', { body: { email, password: newPw } })
  ok('new password accepted (still 2FA)', newLogin.data?.twoFARequired === true)

  console.log('\n── Disable 2FA ──')
  // need a session token; complete a 2FA login with TOTP
  const v2 = await call('POST', '/api/auth/2fa/verify', { body: { challenge: newLogin.data.challenge, code: authenticator.generate(secret) } })
  const tok2 = v2.data.token
  const dis = await call('POST', '/api/auth/2fa/disable', { token: tok2, body: { password: newPw } })
  ok('disable 2FA → ok', dis.data?.ok === true)
  const plain = await call('POST', '/api/auth/login', { body: { email, password: newPw } })
  ok('login no longer requires 2FA', plain.status === 200 && !!plain.data?.token)

  console.log(`\n${'='.repeat(40)}\n  PASSED ${pass} / ${pass + fails.length}`)
  if (fails.length) { console.log('  FAILED:', fails.join(', ')); process.exit(1) }
  console.log('  ALL GREEN ✅'); process.exit(0)
}
main().catch((e) => { console.error('crashed:', e); process.exit(1) })
