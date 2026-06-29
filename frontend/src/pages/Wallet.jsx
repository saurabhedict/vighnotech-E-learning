import { useState } from 'react'
import { useSelector } from 'react-redux'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { commerceApi } from '../api/commerceApi'
import { topupWallet } from '../lib/buy'
import { apiErrorMessage } from '../api/authApi'
import Breadcrumb from '../components/Breadcrumb'

const TYPE_STYLE = {
  topup: 'text-green-300',
  refund: 'text-green-300',
  spend: 'text-[#ff9d6b]',
}

export default function Wallet() {
  const qc = useQueryClient()
  const user = useSelector((s) => s.auth.user)
  const wallet = useQuery({ queryKey: ['wallet'], queryFn: commerceApi.wallet })
  const [amount, setAmount] = useState(500)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const topup = async (amt) => {
    setErr('')
    setBusy(true)
    try {
      const r = await topupWallet(amt, user)
      qc.invalidateQueries({ queryKey: ['wallet'] })
      if (r?.balance != null) qc.setQueryData(['wallet'], (old) => (old ? { ...old, balance: r.balance } : old))
    } catch (e) {
      // The user closing the Razorpay modal isn't an error worth shouting about.
      if (e?.message === 'Payment cancelled') setErr('')
      else setErr(apiErrorMessage(e, 'Top-up failed'))
    } finally {
      setBusy(false)
    }
  }

  const input = 'px-3 py-2 rounded-lg bg-vigno-bg2 border border-vigno-line text-sm outline-none focus:border-vigno-accent'
  return (
    <div>
      <Breadcrumb trail="Wallet" />
      <h1 className="text-2xl mb-5 flex items-center gap-2">
        <svg className="w-6 h-6 text-vigno-txt shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12H17a2 2 0 00-2 2v0a2 2 0 002 2h4" />
        </svg>
        <span>Wallet</span>
      </h1>

      <div className="max-w-3xl bg-vigno-card border border-vigno-line rounded-2xl overflow-hidden shadow-xl mb-6">
        <div className="grid grid-cols-1 md:grid-cols-12">
          {/* Left Column: Virtual Credit-style Balance Card */}
          <div className="md:col-span-5 bg-gradient-to-br from-[#1e40af] via-[#3b82f6] to-[#0284c7] p-6 text-white flex flex-col justify-between min-h-[220px] relative overflow-hidden select-none">
            {/* Background design accents */}
            <div className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-white/10 blur-xl" />
            <div className="absolute -left-12 -bottom-12 w-40 h-40 rounded-full bg-black/20 blur-xl" />
            
            <div className="flex justify-between items-start z-10">
              <span className="text-[10px] uppercase font-bold tracking-widest text-white/70">Virtual Balance Card</span>
              {/* Contactless payment waves */}
              <svg className="w-6 h-6 text-white/60 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M16.5 12a4.5 4.5 0 00-1.35-3.15M19 12a7 7 0 00-2.1-4.9M21.5 12a9.5 9.5 0 00-2.85-6.65M12 12a1 1 0 11-2 0 1 1 0 012 0z" />
              </svg>
            </div>

            {/* SIM chip icon */}
            <div className="my-4 z-10">
              <div className="w-9 h-7 rounded-md bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-400 p-1 flex flex-col justify-between overflow-hidden shadow-inner opacity-90">
                <div className="grid grid-cols-3 gap-0.5 h-full opacity-60">
                  <div className="border-r border-b border-black/20" />
                  <div className="border-r border-b border-black/20" />
                  <div className="border-b border-black/20" />
                  <div className="border-r border-black/20" />
                  <div className="border-r border-black/20" />
                  <div className="border-black/20" />
                </div>
              </div>
            </div>

            <div className="z-10">
              <div className="text-[10px] text-white/60 font-semibold uppercase tracking-wider">Current Balance</div>
              <div className="text-3xl font-black mt-1 flex items-baseline tracking-tight">
                <span className="text-xl font-medium mr-0.5">₹</span>
                <span>{wallet.data?.balance ?? '0'}</span>
              </div>
            </div>

            <div className="flex justify-between items-end mt-4 z-10">
              <span className="text-xs font-semibold tracking-wide text-white/80">{user?.name || 'Vigno Learner'}</span>
              <span className="text-[10px] font-mono text-white/50 tracking-widest">•••• 4844</span>
            </div>
          </div>

          {/* Right Column: Top-up Controls */}
          <div className="md:col-span-7 p-6 flex flex-col justify-between bg-vigno-card">
            <div>
              <h3 className="text-sm font-bold text-vigno-txt mb-4">Top Up Wallet</h3>
              
              {/* Quick Select Buttons */}
              <div className="mb-4">
                <span className="text-[11px] text-vigno-muted block mb-2 font-semibold uppercase tracking-wider">Quick Select</span>
                <div className="flex gap-2">
                  {[200, 500, 1000].map((a) => (
                    <button
                      key={a}
                      disabled={busy}
                      type="button"
                      onClick={() => setAmount(a)}
                      className={`flex-1 border rounded-xl py-2 text-xs font-bold transition-all duration-200 ${
                        amount === a
                          ? 'border-vigno-accent bg-vigno-accent/15 text-vigno-accent'
                          : 'border-vigno-line bg-white/5 hover:bg-white/10 text-vigno-txt'
                      }`}
                    >
                      +₹{a}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Input */}
              <div className="mb-4">
                <span className="text-[11px] text-vigno-muted block mb-2 font-semibold uppercase tracking-wider">Or Enter Custom Amount</span>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-vigno-muted font-bold">₹</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    disabled={busy}
                    placeholder="Enter amount"
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-vigno-bg2 border border-vigno-line text-sm font-semibold outline-none focus:border-vigno-accent transition-all duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>
            </div>

            {/* Action and Security Info */}
            <div className="mt-4">
              <button
                disabled={busy || amount <= 0}
                onClick={() => topup(amount)}
                className="w-full bg-vigno-accent hover:bg-opacity-90 active:scale-[0.99] text-vigno-accent-txt font-extrabold py-3 rounded-xl text-sm transition-all duration-200 shadow-md shadow-vigno-accent/10 disabled:opacity-50"
              >
                {busy ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Processing...</span>
                  </span>
                ) : (
                  'Top up'
                )}
              </button>
              
              {err && <p className="text-xs text-red-300 mt-2.5">{err}</p>}
              
              <p className="text-[10px] text-vigno-muted/60 mt-3.5 flex items-center gap-1.5 select-none leading-normal">
                <svg className="w-3.5 h-3.5 text-vigno-muted/40 shrink-0" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Secured by Razorpay. Test mode — use a Razorpay test card.</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <h2 className="text-lg font-extrabold text-vigno-txt tracking-tight mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-vigno-accent shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h10a2 2 0 012 2v14a2 2 0 01-2 2z" />
        </svg>
        <span>Transaction History</span>
      </h2>

      {wallet.data?.txns?.length === 0 && (
        <div className="p-6 rounded-2xl border border-vigno-line/45 text-center text-vigno-muted bg-vigno-card/30 max-w-xl shadow-sm">
          <p className="text-sm font-semibold text-vigno-txt">No transactions yet</p>
          <p className="text-xs text-vigno-muted mt-1 max-w-xs mx-auto">Your wallet activity and purchases history will appear here.</p>
        </div>
      )}

      {wallet.data?.txns?.length > 0 && (
        <div className="max-w-3xl bg-vigno-card border border-vigno-line rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-black/20 text-vigno-muted text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3">Balance After</th>
                <th className="text-left px-4 py-3">Note</th>
                <th className="text-left px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {wallet.data.txns.map((t) => (
                <tr key={t._id} className="border-t border-vigno-line/40 hover:bg-slate-50/40 dark:hover:bg-white/2">
                  <td className="px-4 py-3.5">
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-bold capitalize select-none inline-block ${
                      t.type === 'topup' || t.type === 'refund'
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                    }`}>
                      {t.type}
                    </span>
                  </td>
                  <td className={`px-4 py-3.5 font-bold ${
                    t.type === 'spend' ? 'text-vigno-txt' : 'text-emerald-500'
                  }`}>
                    {t.type === 'spend' ? '−' : '+'}₹{t.amount}
                  </td>
                  <td className="px-4 py-3.5 text-vigno-muted font-medium">₹{t.balanceAfter}</td>
                  <td className="px-4 py-3.5 text-vigno-muted">{t.note}</td>
                  <td className="px-4 py-3.5 text-vigno-muted text-xs font-medium">{new Date(t.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
