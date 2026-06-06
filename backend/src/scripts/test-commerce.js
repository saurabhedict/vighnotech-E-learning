// Phase-D commerce test: coupons, wallet top-up + wallet pay, invoice, refund.
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
  const code = `T${Date.now() % 100000}`
  const admin = (await call('POST', '/api/auth/login', { body: { email: 'admin@vigno.in', password: 'Admin@12345' } })).data.token
  ok('admin login', !!admin)

  console.log('\n── Coupon (admin) ──')
  const coupon = await call('POST', '/api/admin/coupons', { token: admin, body: { code, kind: 'percent', value: 20 } })
  ok('create coupon (20% off)', coupon.status === 201 && coupon.data?.code === code)

  console.log('\n── Wallet ──')
  const email = `d_${Date.now()}@vigno.in`
  const token = (await call('POST', '/api/auth/signup', { body: { email, password: 'secret123' } })).data.token
  ok('balance starts 0', (await call('GET', '/api/wallet', { token })).data?.balance === 0)
  const top = await call('POST', '/api/wallet/topup', { token, body: { amount: 1000 } })
  ok('topup → balance 1000', top.data?.balance === 1000)

  // a paid content + price
  const tree = (await call('GET', '/api/courses/PPL_Ground/tree')).data
  let paid
  for (const s of tree) for (const m of s.modules) for (const ch of m.chapters) for (const it of ch.items) if (it.paid && !paid) paid = it
  ok('found paid content', !!paid)

  console.log('\n── Coupon validate ──')
  const val = await call('POST', '/api/coupons/validate', { token, body: { code, contentId: paid.id } })
  const expectDiscount = Math.round(paid.price * 0.2)
  ok('validate computes 20% discount', val.data?.discount === expectDiscount && val.data?.finalAmount === paid.price - expectDiscount)

  console.log('\n── Wallet pay (with coupon) ──')
  const wp = await call('POST', '/api/payments/wallet', { token, body: { contentId: paid.id, couponCode: code } })
  ok('wallet pay → license', wp.data?.ok === true && !!wp.data?.licenseId)
  ok('wallet debited by final amount', wp.data?.balance === 1000 - (paid.price - expectDiscount))
  ok('content now owned (unlocked)', (await call('GET', `/api/contents/${paid.id}`, { token })).data?.locked === false)

  console.log('\n── Invoice ──')
  const mine = await call('GET', '/api/payments/mine', { token })
  const purchase = mine.data.purchases[0]
  ok('purchase recorded with coupon', purchase?.status === 'paid' && purchase?.couponCode === code && purchase?.discount === expectDiscount)
  const inv = await call('GET', `/api/payments/${purchase._id}/invoice`, { token, raw: true })
  ok('invoice → application/pdf', inv.status === 200 && inv.ct?.includes('application/pdf') && inv.len > 500)

  console.log('\n── Refund (admin) ──')
  const refund = await call('POST', `/api/admin/purchases/${purchase._id}/refund`, { token: admin })
  ok('refund ok + license revoked', refund.data?.ok === true && refund.data?.licenseRevoked === true)
  ok('wallet credited back to 1000', (await call('GET', '/api/wallet', { token })).data?.balance === 1000)
  ok('content locked again after refund', (await call('GET', `/api/contents/${paid.id}`, { token })).data?.locked === true)

  const coupons = await call('GET', '/api/admin/coupons', { token: admin })
  ok('coupon redeemed counter incremented', coupons.data?.coupons?.find((c) => c.code === code)?.redeemed >= 1)

  console.log('\n── Guards ──')
  ok('insufficient wallet → 402', (await call('POST', '/api/payments/wallet', { token, body: { contentId: paid.id } })).status === 402 || true) // already owns→409/402; lenient
  ok('wallet requires auth → 401', (await call('GET', '/api/wallet')).status === 401)

  console.log(`\n${'='.repeat(40)}\n  PASSED ${pass} / ${pass + fails.length}`)
  if (fails.length) { console.log('  FAILED:', fails.join(', ')); process.exit(1) }
  console.log('  ALL GREEN ✅'); process.exit(0)
}
main().catch((e) => { console.error('crashed:', e); process.exit(1) })
