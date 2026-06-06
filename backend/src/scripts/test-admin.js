// Phase-B admin test: user roles (+last-admin guard), CMS browse, reports + export.
const BASE = process.env.BASE || 'http://localhost:4000'
let pass = 0
const fails = []
const ok = (n, c, e = '') => (c ? (pass++, console.log(`  ✓ ${n}`)) : (fails.push(n), console.log(`  ✗ ${n} ${e}`)))

async function call(method, path, { token, body, raw } = {}) {
  const headers = {}
  if (body) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
  if (raw) return { status: res.status, ct: res.headers.get('content-type'), len: (await res.arrayBuffer()).byteLength }
  let data = null; try { data = await res.json() } catch { /* */ }
  return { status: res.status, data }
}

async function main() {
  console.log('\n── Admin auth ──')
  const al = await call('POST', '/api/auth/login', { body: { email: 'admin@vigno.in', password: 'Admin@12345' } })
  ok('admin login', al.status === 200 && !!al.data?.token)
  const admin = al.data.token

  console.log('\n── Users & roles ──')
  const fresh = `b_${Date.now()}@vigno.in`
  await call('POST', '/api/auth/signup', { body: { email: fresh, password: 'secret123' } })
  const users = await call('GET', '/api/admin/users', { token: admin })
  ok('list users', Array.isArray(users.data?.users) && users.data.users.length >= 2)
  const target = users.data.users.find((u) => u.email === fresh)
  const adminUser = users.data.users.find((u) => u.email === 'admin@vigno.in')
  ok('found fresh user', !!target)

  const promote = await call('PATCH', `/api/admin/users/${target._id}/role`, { token: admin, body: { role: 'admin' } })
  ok('promote to admin', promote.data?.user?.role === 'admin')
  const demote = await call('PATCH', `/api/admin/users/${target._id}/role`, { token: admin, body: { role: 'user' } })
  ok('demote back to user', demote.data?.user?.role === 'user')
  const selfDemote = await call('PATCH', `/api/admin/users/${adminUser._id}/role`, { token: admin, body: { role: 'user' } })
  ok('last-admin/self demote blocked → 403', selfDemote.status === 403)

  console.log('\n── CMS browse ──')
  const roots = await call('GET', '/api/admin/nodes?root=true', { token: admin })
  ok('list root courses (12)', roots.data?.nodes?.length === 12)
  const ppl = roots.data.nodes.find((n) => n.slug === 'PPL_Ground')
  const subjects = await call('GET', `/api/admin/nodes?parentId=${ppl._id}`, { token: admin })
  ok('list subjects of PPL_Ground', subjects.data?.nodes?.length >= 2)

  console.log('\n── Reports + export ──')
  for (const t of ['sales', 'content', 'users']) {
    const r = await call('GET', `/api/admin/reports/${t}`, { token: admin })
    ok(`report ${t} has columns+rows`, Array.isArray(r.data?.columns) && Array.isArray(r.data?.rows) && !!r.data?.summary)
  }
  const csv = await call('GET', '/api/admin/reports/sales/export?format=csv', { token: admin, raw: true })
  ok('export csv → text/csv', csv.status === 200 && csv.ct?.includes('text/csv') && csv.len > 0)
  const xlsx = await call('GET', '/api/admin/reports/users/export?format=xlsx', { token: admin, raw: true })
  ok('export xlsx → spreadsheet', xlsx.status === 200 && xlsx.ct?.includes('spreadsheetml') && xlsx.len > 0)
  const pdf = await call('GET', '/api/admin/reports/content/export?format=pdf', { token: admin, raw: true })
  ok('export pdf → application/pdf', pdf.status === 200 && pdf.ct?.includes('application/pdf') && pdf.len > 0)

  console.log('\n── RBAC ──')
  const sl = await call('POST', '/api/auth/login', { body: { email: 'cadet@aerolearn.in', password: 'password' } })
  const asUser = await call('GET', '/api/admin/users', { token: sl.data.token })
  ok('student blocked from /admin/users → 403', asUser.status === 403)

  console.log(`\n${'='.repeat(40)}\n  PASSED ${pass} / ${pass + fails.length}`)
  if (fails.length) { console.log('  FAILED:', fails.join(', ')); process.exit(1) }
  console.log('  ALL GREEN ✅'); process.exit(0)
}
main().catch((e) => { console.error('crashed:', e); process.exit(1) })
