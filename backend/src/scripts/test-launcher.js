// Phase-G launcher simulation: admin uploads an ENCRYPTED download-lane file,
// a buyer downloads the ciphertext, fetches the license+device-gated key, and
// DECRYPTS it — proving the download lane is genuinely end-to-end encrypted.
import crypto from 'node:crypto'
const BASE = process.env.BASE || 'http://localhost:4000'
let pass = 0
const fails = []
const ok = (n, c, e = '') => (c ? (pass++, console.log(`  ✓ ${n}`)) : (fails.push(n), console.log(`  ✗ ${n} ${e}`)))

async function call(method, path, { token, body } = {}) {
  const headers = {}
  if (body) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
  let data = null; try { data = await res.json() } catch { /* */ }
  return { status: res.status, data }
}

async function main() {
  const PLAINTEXT = Buffer.from('VIGNO-GAME-BINARY ' + 'X'.repeat(2000) + ' END')
  const admin = (await call('POST', '/api/auth/login', { body: { email: 'admin@vigno.in', password: 'Admin@12345' } })).data.token

  console.log('\n── Admin: create + upload encrypted download content ──')
  const course = await call('POST', '/api/admin/nodes', { token: admin, body: { kind: 'course', name: 'Launcher Test' } })
  const subj = await call('POST', '/api/admin/nodes', { token: admin, body: { kind: 'subject', name: 'S', parentId: course.data._id } })
  const modn = await call('POST', '/api/admin/nodes', { token: admin, body: { kind: 'module', name: 'M', parentId: subj.data._id } })
  const chap = await call('POST', '/api/admin/nodes', { token: admin, body: { kind: 'chapter', name: 'C', parentId: modn.data._id } })
  const game = await call('POST', '/api/admin/content', { token: admin, body: { chapterId: chap.data._id, title: 'Flight Sim', type: 'game', isPaid: true, price: 200 } })
  const gameId = game.data._id

  const form = new FormData()
  form.append('file', new Blob([PLAINTEXT]), 'game.bin')
  const up = await fetch(`${BASE}/api/admin/content/${gameId}/upload`, { method: 'POST', headers: { Authorization: `Bearer ${admin}` }, body: form })
  const upData = await up.json()
  ok('upload encrypts download content', upData.encrypted === true)

  console.log('\n── Buyer: own it via wallet ──')
  const email = `g_${Date.now()}@vigno.in`
  const token = (await call('POST', '/api/auth/signup', { body: { email, password: 'secret123' } })).data.token
  await call('POST', '/api/wallet/topup', { token, body: { amount: 500 } })
  const buy = await call('POST', '/api/payments/wallet', { token, body: { contentId: gameId } })
  ok('purchase → license token', !!buy.data?.token)
  const licenseToken = buy.data.token

  console.log('\n── Launcher: register device, download ciphertext, get key, DECRYPT ──')
  const dev = await call('POST', '/api/devices/register', { token, body: { fingerprint: 'launcher-cpu-mb-os-hash', name: 'Gaming PC' } })
  const deviceId = dev.data.deviceId

  const dl = await fetch(`${BASE}/api/content/${gameId}/download`, { headers: { Authorization: `Bearer ${token}` } })
  const ciphertext = Buffer.from(await dl.arrayBuffer())
  ok('downloaded encrypted bytes', ciphertext.length > 0 && !ciphertext.includes(Buffer.from('VIGNO-GAME-BINARY')))

  const keyRes = await call('POST', `/api/content/${gameId}/key`, { token, body: { token: licenseToken, deviceId } })
  ok('key endpoint returns key+iv+tag', !!keyRes.data?.key && !!keyRes.data?.iv && !!keyRes.data?.tag)

  // Decrypt exactly as the launcher would.
  let decrypted = null
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(keyRes.data.key, 'base64'), Buffer.from(keyRes.data.iv, 'base64'))
    decipher.setAuthTag(Buffer.from(keyRes.data.tag, 'base64'))
    decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  } catch (e) {
    decrypted = Buffer.from('DECRYPT_FAILED: ' + e.message)
  }
  ok('DECRYPTED plaintext matches original', decrypted.equals(PLAINTEXT))

  console.log('\n── Device binding ──')
  const dev2 = await call('POST', '/api/devices/register', { token, body: { fingerprint: 'other-device', name: 'Other' } })
  const wrong = await call('POST', `/api/content/${gameId}/key`, { token, body: { token: licenseToken, deviceId: dev2.data.deviceId } })
  ok('different device → 403', wrong.status === 403)

  console.log(`\n${'='.repeat(40)}\n  PASSED ${pass} / ${pass + fails.length}`)
  if (fails.length) { console.log('  FAILED:', fails.join(', ')); process.exit(1) }
  console.log('  ALL GREEN ✅'); process.exit(0)
}
main().catch((e) => { console.error('crashed:', e); process.exit(1) })
