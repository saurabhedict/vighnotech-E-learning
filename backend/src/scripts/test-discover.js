// Phase-C discovery test: favorites, search, progress, recommended.
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
  const login = await call('POST', '/api/auth/login', { body: { email: 'cadet@aerolearn.in', password: 'password' } })
  const token = login.data.token
  ok('student login', !!token)

  // grab a content id
  const tree = await call('GET', '/api/courses/PPL_Ground/tree')
  let cid
  for (const s of tree.data) for (const m of s.modules) for (const ch of m.chapters) for (const it of ch.items) cid ||= it.id

  console.log('\n── Favorites ──')
  ok('add favorite', (await call('POST', `/api/favorites/${cid}`, { token })).status === 201)
  ok('favorite ids include it', (await call('GET', '/api/favorites/ids', { token })).data?.ids?.includes(cid))
  ok('favorites/mine has item', (await call('GET', '/api/favorites/mine', { token })).data?.items?.some((i) => i.id === cid))
  ok('remove favorite', (await call('DELETE', `/api/favorites/${cid}`, { token })).data?.ok === true)
  ok('favorite ids no longer include it', !(await call('GET', '/api/favorites/ids', { token })).data?.ids?.includes(cid))

  console.log('\n── Search ──')
  const search = await call('GET', '/api/search?q=Notes', { token })
  ok('search returns matches', Array.isArray(search.data?.items) && search.data.count >= 1)
  ok('search by type filter', Array.isArray((await call('GET', '/api/search?type=video', { token })).data?.items))

  console.log('\n── Progress (continue watching) ──')
  ok('save progress', (await call('POST', `/api/progress/${cid}`, { token, body: { position: 30, duration: 100 } })).data?.ok === true)
  const prog = await call('GET', '/api/progress/mine', { token })
  const row = prog.data?.items?.find((i) => i.id === cid)
  ok('progress/mine has the item w/ position', row?.position === 30 && row?.duration === 100)

  console.log('\n── Recommended ──')
  ok('recommended returns array', Array.isArray((await call('GET', '/api/recommended', { token })).data?.items))

  console.log('\n── Auth gate ──')
  ok('favorites require auth → 401', (await call('GET', '/api/favorites/ids')).status === 401)

  console.log(`\n${'='.repeat(40)}\n  PASSED ${pass} / ${pass + fails.length}`)
  if (fails.length) { console.log('  FAILED:', fails.join(', ')); process.exit(1) }
  console.log('  ALL GREEN ✅'); process.exit(0)
}
main().catch((e) => { console.error('crashed:', e); process.exit(1) })
