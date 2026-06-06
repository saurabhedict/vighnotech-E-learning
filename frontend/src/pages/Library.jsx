import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { licenseApi } from '../api/licenseApi'
import { paymentsApi } from '../api/paymentsApi'

const ICON = { pdf: '📄', video: '🎬', game: '🎮', '3d': '✈' }
const STATUS = {
  active: 'bg-green-500/20 text-green-300',
  expired: 'bg-yellow-500/20 text-yellow-200',
  revoked: 'bg-red-500/20 text-red-300',
}

function fmt(d) {
  return d ? new Date(d).toLocaleDateString() : '—'
}

export default function Library() {
  const licenses = useQuery({ queryKey: ['licenses', 'mine'], queryFn: licenseApi.mine })
  const purchases = useQuery({ queryKey: ['purchases', 'mine'], queryFn: paymentsApi.mine })

  return (
    <div>
      <div className="text-sm text-vigno-muted mb-1">AeroLearn › My Library</div>
      <h1 className="text-2xl mb-5">📚 My Library</h1>

      {/* Owned licenses */}
      <h2 className="text-base font-bold mb-2.5 pl-2.5 border-l-4 border-vigno-accent">Owned Content (Licenses)</h2>
      {licenses.isLoading && <p className="text-vigno-muted">Loading licenses…</p>}
      {licenses.isError && <p className="text-red-300">Failed to load licenses.</p>}
      {licenses.data?.length === 0 && (
        <p className="text-vigno-muted py-4">No licenses yet. Buy premium content to build your library.</p>
      )}

      <div className="flex flex-wrap gap-4 mb-8">
        {licenses.data?.map((l) => (
          <div key={l.jti} className="w-64 bg-vigno-card border border-vigno-line rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="text-3xl">{ICON[l.content?.type] || '📦'}</div>
              <span className={'text-[10px] font-bold px-2 py-0.5 rounded-full ' + (STATUS[l.status] || 'bg-white/10')}>
                {l.status.toUpperCase()}
              </span>
            </div>
            <div className="mt-2.5 font-semibold text-sm">{l.content?.title || 'Content'}</div>
            <div className="mt-1 text-xs text-vigno-muted capitalize">{l.type} lane · expires {fmt(l.expiresAt)}</div>
            <div className="mt-3">
              {l.usable && l.content ? (
                <Link to={`/app/content/${l.content.id}`}
                  className="inline-block text-xs font-bold bg-vigno-accent text-[#1a0d0f] rounded-lg px-3 py-1.5 hover:brightness-110">
                  ▶ Open
                </Link>
              ) : (
                <span className="text-xs text-vigno-muted">{l.status === 'revoked' ? 'Access revoked' : 'Expired'}</span>
              )}
            </div>
            <div className="mt-2 text-[10px] text-vigno-muted/60 font-mono break-all">{l.jti}</div>
          </div>
        ))}
      </div>

      {/* Purchase history / receipts */}
      <h2 className="text-base font-bold mb-2.5 pl-2.5 border-l-4 border-vigno-accent">Purchase History</h2>
      {purchases.isLoading && <p className="text-vigno-muted">Loading purchases…</p>}
      {purchases.isError && <p className="text-red-300">Failed to load purchases.</p>}
      {purchases.data?.length === 0 && <p className="text-vigno-muted py-4">No purchases yet.</p>}

      {purchases.data?.length > 0 && (
        <div className="max-w-3xl bg-vigno-card border border-vigno-line rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-black/20 text-vigno-muted text-xs">
              <tr>
                <th className="text-left px-4 py-2.5">Content</th>
                <th className="text-left px-4 py-2.5">Amount</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th className="text-left px-4 py-2.5">Date</th>
                <th className="text-right px-4 py-2.5">Invoice</th>
              </tr>
            </thead>
            <tbody>
              {purchases.data.map((p) => (
                <tr key={p._id} className="border-t border-vigno-line/50">
                  <td className="px-4 py-2.5">{p.contentId?.title || '—'}</td>
                  <td className="px-4 py-2.5">
                    ₹{p.amount}
                    {p.discount > 0 && <span className="text-green-300 text-xs ml-1">(−₹{p.discount}{p.couponCode ? ` ${p.couponCode}` : ''})</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={'text-[10px] font-bold px-2 py-0.5 rounded-full ' +
                      (p.status === 'paid' ? 'bg-green-500/20 text-green-300'
                        : p.status === 'refunded' ? 'bg-red-500/20 text-red-300'
                        : 'bg-white/10 text-vigno-muted')}>
                      {p.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-vigno-muted">{fmt(p.paidAt || p.createdAt)}</td>
                  <td className="px-4 py-2.5 text-right">
                    {['paid', 'refunded'].includes(p.status) && (
                      <button onClick={() => paymentsApi.downloadInvoice(p._id)} className="text-xs text-vigno-accent2 hover:underline">⬇ PDF</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
