import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../api/adminApi'
import { apiErrorMessage } from '../../api/authApi'
import CmsManager from './CmsManager'
import UsersPanel from './UsersPanel'
import ReportsPanel from './ReportsPanel'
import CommercePanel from './CommercePanel'
import SettingsPanel from './SettingsPanel'
import Breadcrumb from '../../components/Breadcrumb'

function StatCard({ label, value, accent }) {
  return (
    <div className="bg-vigno-card border border-vigno-line rounded-2xl p-4 min-w-[140px]">
      <div className="text-xs text-vigno-muted">{label}</div>
      <div className={'text-2xl font-extrabold mt-1 ' + (accent ? 'text-vigno-accent2' : '')}>{value}</div>
    </div>
  )
}

function Overview() {
  const stats = useQuery({ queryKey: ['admin', 'stats'], queryFn: adminApi.stats })
  if (stats.isLoading) return <p className="text-vigno-muted">Loading stats…</p>
  if (stats.isError) return <p className="text-red-300">Failed to load stats.</p>
  const s = stats.data
  return (
    <div className="flex flex-wrap gap-4">
      <StatCard label="Users" value={s.users} />
      <StatCard label="Content items" value={s.contents} />
      <StatCard label="Purchases" value={s.purchases} />
      <StatCard label="Active licenses" value={s.activeLicenses} />
      <StatCard label="Revenue (₹)" value={s.revenue} accent />
    </div>
  )
}

function RevokeLicense() {
  const [jti, setJti] = useState('')
  const [reason, setReason] = useState('refund')
  const [msg, setMsg] = useState(null)
  const qc = useQueryClient()
  const revoke = async () => {
    setMsg(null)
    try {
      await adminApi.revokeLicense(jti.trim(), reason)
      setMsg({ ok: true, text: `Revoked ${jti}` })
      setJti('')
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    } catch (e) { setMsg({ ok: false, text: apiErrorMessage(e, 'Revoke failed') }) }
  }
  const input = 'px-3 py-2 rounded-lg bg-vigno-bg2 border border-vigno-line text-sm outline-none focus:border-vigno-accent'
  return (
    <div>
      <p className="text-xs text-vigno-muted mb-3">Revoke a license (refund / fraud). It stops working on the next verify.</p>
      {msg && <p className={'text-sm mb-2 ' + (msg.ok ? 'text-green-300' : 'text-red-300')}>{msg.text}</p>}
      <div className="flex flex-wrap gap-2 items-center">
        <input placeholder="lic_…" value={jti} onChange={(e) => setJti(e.target.value)} className={input + ' flex-1 min-w-[200px] font-mono'} />
        <select value={reason} onChange={(e) => setReason(e.target.value)} className={input}>
          <option value="refund">refund</option><option value="fraud">fraud</option><option value="admin_revoke">admin</option>
        </select>
        <button onClick={revoke} disabled={!jti.trim()} className="bg-red-500/80 hover:bg-red-500 text-white font-bold px-4 py-2 rounded-lg text-sm disabled:opacity-50">Revoke</button>
      </div>
    </div>
  )
}

function AuditLog() {
  const audit = useQuery({ queryKey: ['admin', 'audit'], queryFn: () => adminApi.audit(60) })
  if (audit.isLoading) return <p className="text-vigno-muted">Loading activity…</p>
  if (audit.isError) return <p className="text-red-300">Failed to load activity.</p>
  return (
    <div className="max-h-[28rem] overflow-auto">
      <table className="w-full text-sm">
        <thead className="bg-black/20 text-vigno-muted text-xs sticky top-0">
          <tr><th className="text-left px-3 py-2">Action</th><th className="text-left px-3 py-2">Target</th><th className="text-left px-3 py-2">Time</th></tr>
        </thead>
        <tbody>
          {audit.data.map((l) => (
            <tr key={l._id} className="border-t border-vigno-line/40">
              <td className="px-3 py-1.5 font-mono text-xs">{l.action}</td>
              <td className="px-3 py-1.5 text-vigno-muted text-xs">{l.targetType || ''} {l.targetId || ''}</td>
              <td className="px-3 py-1.5 text-vigno-muted text-xs">{new Date(l.time).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Panel({ title, children }) {
  return (
    <section className="bg-vigno-card border border-vigno-line rounded-2xl p-5 mb-6">
      <h2 className="text-base font-bold mb-3 pl-2.5 border-l-4 border-vigno-accent">{title}</h2>
      {children}
    </section>
  )
}

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'content', label: 'Content (CMS)' },
  { key: 'users', label: '👥 Manage Users' },
  { key: 'reports', label: 'Reports' },
  { key: 'commerce', label: 'Commerce' },
  { key: 'licenses', label: 'Licenses' },
  { key: 'settings', label: '⚙ Site Settings' },
  { key: 'audit', label: 'Audit' },
]

export default function AdminDashboard() {
  const [tab, setTab] = useState('overview')
  const tabCls = (a) => 'px-3 py-1.5 rounded-lg text-sm ' + (a ? 'bg-vigno-accent text-[#1a0d0f] font-bold' : 'bg-white/10 hover:bg-white/20')

  return (
    <div>
      <Breadcrumb trail="Admin" />
      <h1 className="text-2xl mb-5">🛠 Admin Dashboard</h1>

      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((t) => <button key={t.key} className={tabCls(tab === t.key)} onClick={() => setTab(t.key)}>{t.label}</button>)}
      </div>

      {tab === 'overview' && <><div className="mb-6"><Overview /></div></>}
      {tab === 'content' && <Panel title="Content Tree Manager"><CmsManager /></Panel>}
      {tab === 'users' && <Panel title="Manage Users"><UsersPanel /></Panel>}
      {tab === 'reports' && <Panel title="Reports & Export"><ReportsPanel /></Panel>}
      {tab === 'commerce' && <Panel title="Coupons & Refunds"><CommercePanel /></Panel>}
      {tab === 'licenses' && <Panel title="Revoke License"><RevokeLicense /></Panel>}
      {tab === 'settings' && <Panel title="Site Settings — Footer & Branding"><SettingsPanel /></Panel>}
      {tab === 'audit' && <Panel title="Recent Activity (Audit Log)"><AuditLog /></Panel>}
    </div>
  )
}
