// End-to-end API smoke test against a running server (node src/scripts/smoketest.js).
// Exercises: health, public key, browse, auth, ownership gate, pay→license, unlock,
// verify, revoke, admin. Exits non-zero on first failure.
const BASE = process.env.BASE || 'http://localhost:4000'
let pass = 0
const fails = []

function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}`) }
  else { fails.push(name); console.log(`  ✗ ${name} ${extra}`) }
}

async function call(method, path, { token, body } = {}) {
  const headers = {}
  if (body) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
  let data = null
  try { data = await res.json() } catch { /* non-json */ }
  return { status: res.status, data }
}

async function main() {
  console.log('\n── Health & keys ──')
  ok('GET /health', (await call('GET', '/health')).data?.ok === true)
  const jwks = await call('GET', '/.well-known/vigno-public-key')
  ok('public key is EC/ES256', jwks.data?.keys?.[0]?.kty === 'EC' && jwks.data.keys[0].alg === 'ES256')

  console.log('\n── Browse (public) ──')
  const courses = await call('GET', '/api/courses')
  ok('GET /api/courses returns 12', Array.isArray(courses.data) && courses.data.length === 12)
  ok('includes PPL_Ground', courses.data?.includes('PPL_Ground'))
  const tree = await call('GET', '/api/courses/PPL_Ground/tree')
  ok('tree has subjects', Array.isArray(tree.data) && tree.data.length >= 2)

  // collect a free pdf id and a paid id from the tree
  let freePdfId, paidId, moduleId
  for (const s of tree.data) for (const m of s.modules) {
    moduleId ||= m.id
    for (const ch of m.chapters) for (const it of ch.items) {
      if (!it.paid && it.type === 'pdf') freePdfId ||= it.id
      if (it.paid) paidId ||= it.id
    }
  }
  ok('found a free pdf + a paid item', !!freePdfId && !!paidId)

  console.log('\n── Auth ──')
  const badLogin = await call('POST', '/api/auth/login', { body: { email: 'cadet@aerolearn.in', password: 'wrong' } })
  ok('bad password → 401', badLogin.status === 401)
  const login = await call('POST', '/api/auth/login', { body: { email: 'cadet@aerolearn.in', password: 'password' } })
  ok('student login → token', login.status === 200 && !!login.data?.token)
  const token = login.data.token
  const meRes = await call('GET', '/api/auth/me', { token })
  ok('GET /me returns user', meRes.data?.user?.email === 'cadet@aerolearn.in')
  ok('/me without token → 401', (await call('GET', '/api/auth/me')).status === 401)

  // signup a fresh user
  const email = `test_${Date.now()}@vigno.in`
  const signup = await call('POST', '/api/auth/signup', { body: { email, password: 'secret123' } })
  ok('signup → 201 + token', signup.status === 201 && !!signup.data?.token)
  ok('duplicate signup → 409', (await call('POST', '/api/auth/signup', { body: { email, password: 'secret123' } })).status === 409)

  console.log('\n── Content access (stream lane) ──')
  const freePdf = await call('GET', `/api/contents/${freePdfId}`, { token })
  ok('free pdf returns a url (unlocked)', freePdf.data?.locked === false && !!freePdf.data?.url)
  const paidNoOwn = await call('GET', `/api/contents/${paidId}`, { token })
  ok('paid+unowned → locked:true', paidNoOwn.data?.locked === true && !paidNoOwn.data?.url && !paidNoOwn.data?.src)
  const streamUrlDenied = await call('GET', `/api/content/${paidId}/stream-url`, { token })
  ok('stream-url for unowned paid → 402', streamUrlDenied.status === 402)

  console.log('\n── Pay → License → Unlock ──')
  const order = await call('POST', '/api/payments/order', { token, body: { contentId: paidId } })
  ok('create order (mock)', order.status === 201 && order.data?.mock === true && !!order.data?.mockSignature)
  const verify = await call('POST', '/api/payments/verify', {
    token,
    body: {
      razorpay_order_id: order.data.orderId,
      razorpay_payment_id: order.data.mockPaymentId,
      razorpay_signature: order.data.mockSignature,
    },
  })
  ok('verify payment → license issued', verify.status === 200 && !!verify.data?.licenseId && !!verify.data?.token)
  const licenseToken = verify.data.token

  const mine = await call('GET', '/api/licenses/mine', { token })
  ok('GET /licenses/mine has 1 usable', mine.data?.licenses?.some((l) => l.usable))
  const lv = await call('POST', '/api/licenses/verify', { body: { token: licenseToken } })
  ok('POST /licenses/verify → valid', lv.data?.valid === true)
  const tamper = await call('POST', '/api/licenses/verify', { body: { token: licenseToken.slice(0, -3) + 'aaa' } })
  ok('tampered token → invalid', tamper.data?.valid === false)

  const paidOwned = await call('GET', `/api/contents/${paidId}`, { token })
  ok('paid+owned now unlocked', paidOwned.data?.locked === false)
  const dupOrder = await call('POST', '/api/payments/order', { token, body: { contentId: paidId } })
  ok('duplicate order for owned content → 409', dupOrder.status === 409)

  // idempotency: verify again returns alreadyProcessed
  const verify2 = await call('POST', '/api/payments/verify', {
    token,
    body: {
      razorpay_order_id: order.data.orderId,
      razorpay_payment_id: order.data.mockPaymentId,
      razorpay_signature: order.data.mockSignature,
    },
  })
  ok('verify is idempotent', verify2.data?.alreadyProcessed === true)

  console.log('\n── Admin (RBAC) ──')
  ok('student hitting /admin/stats → 403', (await call('GET', '/api/admin/stats', { token })).status === 403)
  const adminLogin = await call('POST', '/api/auth/login', { body: { email: 'admin@vigno.in', password: 'Admin@12345' } })
  ok('admin login', adminLogin.status === 200)
  const adminToken = adminLogin.data.token
  const stats = await call('GET', '/api/admin/stats', { token: adminToken })
  ok('admin stats: revenue > 0 after purchase', stats.status === 200 && stats.data?.revenue > 0)

  // admin revoke the license, then verify should fail
  const lic = mine.data.licenses[0].jti
  const revoke = await call('POST', `/api/admin/licenses/${lic}/revoke`, { token: adminToken, body: { reason: 'test' } })
  ok('admin revoke → ok', revoke.data?.ok === true)
  const lvAfter = await call('POST', '/api/licenses/verify', { body: { token: licenseToken } })
  ok('verify after revoke → revoked', lvAfter.data?.valid === false && lvAfter.data?.reason === 'revoked')

  console.log('\n── Input validation ──')
  ok('invalid content id → 400 (not 500)', (await call('GET', '/api/contents/notanid')).status === 400)

  console.log('\n── Signed URL is content-bound (IDOR fix) ──')
  let pdf2
  for (const s of tree.data) for (const m of s.modules) for (const ch of m.chapters) for (const it of ch.items) {
    if (!it.paid && it.type === 'pdf' && it.id !== freePdfId) pdf2 ||= it.id
  }
  const su = await call('GET', `/api/content/${freePdfId}/stream-url`, { token })
  ok('stream-url returns a url', !!su.data?.url)
  const tokenUrl = su.data.url
  const tk = new URL(tokenUrl).searchParams.get('token')
  ok('signed URL streams the correct content', (await fetch(tokenUrl)).status === 200)
  if (pdf2) {
    const cross = await fetch(`${BASE}/api/files/${pdf2}/stream?token=${encodeURIComponent(tk)}`)
    ok('signed token rejected for a DIFFERENT content (403)', cross.status === 403)
  } else {
    ok('signed token rejected for a different content (skipped: <2 free pdfs)', true)
  }

  console.log('\n── Devices (download lane) ──')
  const dev = await call('POST', '/api/devices/register', { token, body: { fingerprint: 'cpu-mb-os-hash-abc123', name: 'Test PC' } })
  ok('device register → deviceId', dev.status === 201 && !!dev.data?.deviceId)
  const dev1 = dev.data.deviceId
  const dev2res = await call('POST', '/api/devices/register', { token, body: { fingerprint: 'other-device-xyz789', name: 'Other PC' } })
  const dev2 = dev2res.data.deviceId

  console.log('\n── Download lane: buy → first-use device bind → key (end-to-end) ──')
  // admin builds a download (game) content item
  const course = await call('POST', '/api/admin/nodes', { token: adminToken, body: { kind: 'course', name: 'ZZ Test Lane' } })
  const subj = await call('POST', '/api/admin/nodes', { token: adminToken, body: { kind: 'subject', name: 'S', parentId: course.data._id } })
  const modn = await call('POST', '/api/admin/nodes', { token: adminToken, body: { kind: 'module', name: 'M', parentId: subj.data._id } })
  const chap = await call('POST', '/api/admin/nodes', { token: adminToken, body: { kind: 'chapter', name: 'C', parentId: modn.data._id } })
  const game = await call('POST', '/api/admin/content', { token: adminToken, body: { chapterId: chap.data._id, title: 'Sim Game', type: 'game', isPaid: true, price: 100 } })
  ok('admin created download-lane game content', game.status === 201 && game.data?.lane === 'download')
  const gameId = game.data._id

  // student buys it
  const gOrder = await call('POST', '/api/payments/order', { token, body: { contentId: gameId } })
  const gVerify = await call('POST', '/api/payments/verify', {
    token,
    body: { razorpay_order_id: gOrder.data.orderId, razorpay_payment_id: gOrder.data.mockPaymentId, razorpay_signature: gOrder.data.mockSignature },
  })
  ok('bought download content → license token', !!gVerify.data?.token)
  const gToken = gVerify.data.token

  const key1 = await call('POST', `/api/content/${gameId}/key`, { token, body: { token: gToken, deviceId: dev1 } })
  ok('first key request binds device + returns key', key1.status === 200 && !!key1.data?.key)
  const key2 = await call('POST', `/api/content/${gameId}/key`, { token, body: { token: gToken, deviceId: dev1 } })
  ok('same device → key again', key2.status === 200 && key2.data?.key === key1.data?.key)
  const key3 = await call('POST', `/api/content/${gameId}/key`, { token, body: { token: gToken, deviceId: dev2 } })
  ok('different device → 403 (device-bound)', key3.status === 403)

  console.log(`\n${'='.repeat(40)}`)
  console.log(`  PASSED ${pass} / ${pass + fails.length}`)
  if (fails.length) { console.log('  FAILED:', fails.join(', ')); process.exit(1) }
  console.log('  ALL GREEN ✅')
  process.exit(0)
}

main().catch((e) => { console.error('smoketest crashed:', e); process.exit(1) })
