import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../../api/adminApi'

const TYPES = [
  { key: 'sales', label: 'Sales' },
  { key: 'content', label: 'Content' },
  { key: 'users', label: 'Users' },
]

export default function ReportsPanel() {
  const [type, setType] = useState('sales')
  const [busy, setBusy] = useState('')
  const report = useQuery({ queryKey: ['admin', 'report', type], queryFn: () => adminApi.report(type) })

  const download = async (fmt) => {
    setBusy(fmt)
    try { await adminApi.exportReport(type, fmt) } finally { setBusy('') }
  }

  const tabBtn = (active) =>
    'px-3 py-1.5 rounded-lg text-sm ' + (active ? 'bg-vigno-accent text-[#1a0d0f] font-bold' : 'bg-white/10 hover:bg-white/20')

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {TYPES.map((t) => (
          <button key={t.key} className={tabBtn(type === t.key)} onClick={() => setType(t.key)}>{t.label}</button>
        ))}
        <span className="flex-1" />
        <span className="text-xs text-vigno-muted">Export:</span>
        {['csv', 'xlsx', 'pdf'].map((f) => (
          <button key={f} disabled={!!busy} onClick={() => download(f)}
            className="text-xs bg-white/10 hover:bg-white/20 border border-vigno-line rounded-lg px-2.5 py-1.5 disabled:opacity-50 uppercase">
            {busy === f ? '…' : f}
          </button>
        ))}
      </div>

      {report.isLoading && <p className="text-vigno-muted">Loading report…</p>}
      {report.isError && <p className="text-red-300">Failed to load report.</p>}
      {report.data && (
        <>
          <div className="flex flex-wrap gap-3 mb-4 text-sm">
            {Object.entries(report.data.summary || {}).map(([k, v]) => (
              <div key={k} className="bg-black/20 rounded-lg px-3 py-2">
                <span className="text-vigno-muted text-xs">{k}: </span>
                <span className="font-bold">{typeof v === 'object' ? JSON.stringify(v) : v}</span>
              </div>
            ))}
          </div>
          <div className="max-h-[26rem] overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-black/20 text-vigno-muted text-xs sticky top-0">
                <tr>{report.data.columns.map((c) => <th key={c.key} className="text-left px-3 py-2">{c.label}</th>)}</tr>
              </thead>
              <tbody>
                {report.data.rows.map((r, i) => (
                  <tr key={i} className="border-t border-vigno-line/40">
                    {report.data.columns.map((c) => <td key={c.key} className="px-3 py-1.5">{r[c.key]}</td>)}
                  </tr>
                ))}
                {report.data.rows.length === 0 && (
                  <tr><td colSpan={report.data.columns.length} className="px-3 py-4 text-vigno-muted">No data yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
