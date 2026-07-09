import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../api/adminApi'
import { apiErrorMessage } from '../../api/authApi'

const input = 'px-3 py-2 rounded-lg bg-vigno-bg2 border border-vigno-line text-sm outline-none'

function Coupons() {
  const qc = useQueryClient()
  const coupons = useQuery({ queryKey: ['admin', 'coupons'], queryFn: adminApi.listCoupons })
  const [form, setForm] = useState({ code: '', kind: 'percent', value: 10, maxRedemptions: 0 })
  const [msg, setMsg] = useState(null)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const create = async () => {
    setMsg(null)
    try {
      await adminApi.createCoupon({
        code: form.code.trim(),
        kind: form.kind,
        value: Number(form.value),
        maxRedemptions: Number(form.maxRedemptions) || 0,
      })
      setMsg({ ok: true, text: `Created ${form.code.toUpperCase()}` })
      setForm({ code: '', kind: 'percent', value: 10, maxRedemptions: 0 })
      qc.invalidateQueries({ queryKey: ['admin', 'coupons'] })
    } catch (e) { setMsg({ ok: false, text: apiErrorMessage(e, 'Create failed') }) }
  }
  const del = async (id) => {
    await adminApi.deleteCoupon(id)
    qc.invalidateQueries({ queryKey: ['admin', 'coupons'] })
  }

  return (
    <div>
      {msg && <p className={'text-sm mb-4 ' + (msg.ok ? 'text-green-300' : 'text-red-300')}>{msg.text}</p>}
      <div className="flex flex-col gap-4 mb-6 p-4 rounded-xl border border-vigno-line/40 bg-black/5 dark:bg-white/5 shadow-sm">
        <h4 className="text-[11px] font-extrabold text-vigno-txt uppercase tracking-wider">Create New Coupon</h4>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col space-y-1.5 flex-1 min-w-[120px]">
            <label className="text-[10px] font-bold text-vigno-muted uppercase ml-1 tracking-wide">Coupon Code</label>
            <input placeholder="e.g. SALE50" value={form.code} onChange={set('code')} className={input + ' uppercase w-full font-mono'} />
          </div>
          <div className="flex flex-col space-y-1.5">
            <label className="text-[10px] font-bold text-vigno-muted uppercase ml-1 tracking-wide">Type</label>
            <select value={form.kind} onChange={set('kind')} className={input + ' w-28'}>
              <option value="percent">% off</option>
              <option value="flat">₹ off</option>
            </select>
          </div>
          <div className="flex flex-col space-y-1.5 flex-1 min-w-[120px]">
            <label className="text-[10px] font-bold text-vigno-muted uppercase ml-1 tracking-wide">Discount Value</label>
            <input type="text" inputMode="numeric" pattern="[0-9]*" placeholder="e.g. 10" value={form.value} onChange={set('value')} className={input + ' w-full'} />
          </div>
          <div className="flex flex-col space-y-1.5 flex-1 min-w-[120px]">
            <label className="text-[10px] font-bold text-vigno-muted uppercase ml-1 tracking-wide">Usage Limit (0 = ∞)</label>
            <input type="text" inputMode="numeric" pattern="[0-9]*" placeholder="0" value={form.maxRedemptions} onChange={set('maxRedemptions')} className={input + ' w-full'} />
          </div>
          <div className="pt-2 w-full sm:w-auto">
            <button onClick={create} disabled={!form.code.trim()} className="w-full sm:w-auto bg-vigno-accent hover:brightness-110 text-vigno-accent-txt font-extrabold px-6 py-2.5 rounded-lg text-sm transition-all disabled:opacity-50 active:scale-95">
              + Create
            </button>
          </div>
        </div>
      </div>
      <table className="w-full text-sm mt-2">
        <thead className="bg-black/20 text-vigno-muted text-xs">
          <tr><th className="text-left px-3 py-2">Code</th><th className="text-left px-3 py-2">Discount</th><th className="text-left px-3 py-2">Redeemed</th><th className="text-right px-3 py-2"></th></tr>
        </thead>
        <tbody>
          {coupons.data?.map((c) => (
            <tr key={c._id} className="border-t border-vigno-line/40">
              <td className="px-3 py-1.5 font-mono">{c.code}</td>
              <td className="px-3 py-1.5">{c.kind === 'percent' ? `${c.value}%` : `₹${c.value}`}</td>
              <td className="px-3 py-1.5 text-vigno-muted">{c.redeemed}{c.maxRedemptions ? ` / ${c.maxRedemptions}` : ''}</td>
              <td className="px-3 py-1.5 text-right"><button onClick={() => del(c._id)} className="text-xs text-red-300 hover:underline">Delete</button></td>
            </tr>
          ))}
          {coupons.data?.length === 0 && <tr><td colSpan={4} className="px-3 py-3 text-vigno-muted">No coupons yet.</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

function Refund() {
  const [id, setId] = useState('')
  const [msg, setMsg] = useState(null)
  const refund = async () => {
    setMsg(null)
    try {
      const r = await adminApi.refundPurchase(id.trim())
      setMsg({ ok: true, text: `Refunded ₹${r.refunded} · license ${r.licenseRevoked ? 'revoked' : 'n/a'}` })
      setId('')
    } catch (e) { setMsg({ ok: false, text: apiErrorMessage(e, 'Refund failed') }) }
  }
  return (
    <div>
      <p className="text-xs text-vigno-muted mb-3">Refund a purchase by its id → revokes the license and credits the buyer's wallet.</p>
      {msg && <p className={'text-sm mb-2 ' + (msg.ok ? 'text-green-300' : 'text-red-300')}>{msg.text}</p>}
      <div className="flex gap-2">
        <input placeholder="purchase id" value={id} onChange={(e) => setId(e.target.value)} className={input + ' flex-1 font-mono'} />
        <button onClick={refund} disabled={!id.trim()} className="bg-red-500/80 hover:bg-red-500 text-white font-bold px-4 py-2 rounded-lg text-sm disabled:opacity-50">Refund</button>
      </div>
    </div>
  )
}

export default function CommercePanel() {
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div><h3 className="text-sm font-bold mb-3 text-vigno-muted">Coupons</h3><Coupons /></div>
      <div><h3 className="text-sm font-bold mb-3 text-vigno-muted">Refund a Purchase</h3><Refund /></div>
    </div>
  )
}
