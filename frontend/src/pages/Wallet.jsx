import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { commerceApi } from '../api/commerceApi'
import { apiErrorMessage } from '../api/authApi'

const TYPE_STYLE = {
  topup: 'text-green-300',
  refund: 'text-green-300',
  spend: 'text-[#ff9d6b]',
}

export default function Wallet() {
  const qc = useQueryClient()
  const wallet = useQuery({ queryKey: ['wallet'], queryFn: commerceApi.wallet })
  const [amount, setAmount] = useState(500)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const topup = async (amt) => {
    setErr('')
    setBusy(true)
    try {
      await commerceApi.topup(amt)
      qc.invalidateQueries({ queryKey: ['wallet'] })
    } catch (e) {
      setErr(apiErrorMessage(e, 'Top-up failed'))
    } finally {
      setBusy(false)
    }
  }

  const input = 'px-3 py-2 rounded-lg bg-[#1c0e11] border border-vigno-line text-sm outline-none focus:border-vigno-accent'
  return (
    <div>
      <div className="text-sm text-vigno-muted mb-1">AeroLearn › Wallet</div>
      <h1 className="text-2xl mb-5">👛 Wallet</h1>

      <div className="max-w-2xl bg-vigno-card border border-vigno-line rounded-2xl p-5 mb-6">
        <div className="text-xs text-vigno-muted">Balance</div>
        <div className="text-3xl font-extrabold text-vigno-accent2 mt-1 mb-4">₹{wallet.data?.balance ?? '…'}</div>

        <div className="flex flex-wrap gap-2 items-center">
          {[200, 500, 1000].map((a) => (
            <button key={a} disabled={busy} onClick={() => topup(a)}
              className="bg-white/10 hover:bg-white/20 border border-vigno-line rounded-lg px-3 py-2 text-sm disabled:opacity-50">+₹{a}</button>
          ))}
          <span className="mx-1 text-vigno-muted text-xs">or</span>
          <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className={input + ' w-28'} />
          <button disabled={busy || amount <= 0} onClick={() => topup(amount)}
            className="bg-vigno-accent text-[#1a0d0f] font-bold px-4 py-2 rounded-lg text-sm disabled:opacity-50">
            {busy ? '…' : 'Top up'}
          </button>
        </div>
        {err && <p className="text-sm text-red-300 mt-2">{err}</p>}
        <p className="text-[11px] text-vigno-muted/70 mt-3">Demo top-up adds store credit instantly. In production this routes through Razorpay.</p>
      </div>

      <h2 className="text-base font-bold mb-2.5 pl-2.5 border-l-4 border-vigno-accent">History</h2>
      {wallet.data?.txns?.length === 0 && <p className="text-vigno-muted py-4">No transactions yet.</p>}
      {wallet.data?.txns?.length > 0 && (
        <div className="max-w-2xl bg-vigno-card border border-vigno-line rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-black/20 text-vigno-muted text-xs">
              <tr><th className="text-left px-4 py-2.5">Type</th><th className="text-left px-4 py-2.5">Amount</th><th className="text-left px-4 py-2.5">Balance</th><th className="text-left px-4 py-2.5">Note</th><th className="text-left px-4 py-2.5">Date</th></tr>
            </thead>
            <tbody>
              {wallet.data.txns.map((t) => (
                <tr key={t._id} className="border-t border-vigno-line/50">
                  <td className={'px-4 py-2.5 font-semibold ' + (TYPE_STYLE[t.type] || '')}>{t.type}</td>
                  <td className="px-4 py-2.5">{t.type === 'spend' ? '−' : '+'}₹{t.amount}</td>
                  <td className="px-4 py-2.5 text-vigno-muted">₹{t.balanceAfter}</td>
                  <td className="px-4 py-2.5 text-vigno-muted">{t.note}</td>
                  <td className="px-4 py-2.5 text-vigno-muted text-xs">{new Date(t.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
