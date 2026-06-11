import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../api/adminApi'
import { apiErrorMessage } from '../../api/authApi'
import { subscribeUploads } from '../../lib/uploadManager'
import CmsManager from './CmsManager'
import UsersPanel from './UsersPanel'
import ReportsPanel from './ReportsPanel'
import CommercePanel from './CommercePanel'
import SettingsPanel from './SettingsPanel'
import Breadcrumb from '../../components/Breadcrumb'

function StatCard({ label, value, accent, icon }) {
  return (
    <div className="bg-vigno-card border border-vigno-line/60 rounded-xl p-5 flex items-start gap-4 hover:border-vigno-accent/30 transition-colors">
      {icon && (
        <div className="w-10 h-10 rounded-lg bg-vigno-accent/10 flex items-center justify-center text-vigno-accent shrink-0">
          {icon}
        </div>
      )}
      <div>
        <div className="text-xs text-vigno-muted font-medium uppercase tracking-wide mb-1">{label}</div>
        <div className={'text-2xl font-bold ' + (accent ? 'text-vigno-accent2' : 'text-vigno-txt')}>{value ?? '—'}</div>
      </div>
    </div>
  )
}

function Overview() {
  const stats = useQuery({ queryKey: ['admin', 'stats'], queryFn: adminApi.stats })
  if (stats.isLoading) return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {[...Array(5)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-vigno-card border border-vigno-line/40 animate-pulse" />)}
    </div>
  )
  if (stats.isError) return <p className="text-red-300 text-sm">Failed to load stats.</p>
  const s = stats.data
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      <StatCard label="Users" value={s.users} icon={<UsersIcon />} />
      <StatCard label="Content Items" value={s.contents} icon={<ContentIcon />} />
      <StatCard label="Purchases" value={s.purchases} icon={<PurchaseIcon />} />
      <StatCard label="Active Licenses" value={s.activeLicenses} icon={<LicenseIcon />} />
      <StatCard label="Revenue (₹)" value={s.revenue} accent icon={<RevenueIcon />} />
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
      setMsg({ ok: true, text: `License revoked: ${jti}` })
      setJti('')
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    } catch (e) { setMsg({ ok: false, text: apiErrorMessage(e, 'Revoke failed') }) }
  }
  const input = 'px-3 py-2 rounded-lg bg-vigno-bg2 border border-vigno-line/60 text-sm outline-none focus:border-vigno-accent text-vigno-txt transition-colors'
  return (
    <div>
      <p className="text-sm text-vigno-muted mb-4">Revoke a license for refund or fraud cases. Takes effect on the user's next verification.</p>
      {msg && <p className={'text-sm mb-3 px-3 py-2 rounded-lg ' + (msg.ok ? 'text-green-300 bg-green-500/10 border border-green-500/20' : 'text-red-300 bg-red-500/10 border border-red-500/20')}>{msg.text}</p>}
      <div className="flex flex-wrap gap-2 items-center">
        <input placeholder="License ID (lic_…)" value={jti} onChange={(e) => setJti(e.target.value)} className={input + ' flex-1 min-w-[200px] font-mono text-xs'} />
        <select value={reason} onChange={(e) => setReason(e.target.value)} className={input}>
          <option value="refund">Refund</option>
          <option value="fraud">Fraud</option>
          <option value="admin_revoke">Admin Revoke</option>
        </select>
        <button onClick={revoke} disabled={!jti.trim()}
          className="bg-red-500/80 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
          Revoke License
        </button>
      </div>
    </div>
  )
}

function AuditLog() {
  const audit = useQuery({ queryKey: ['admin', 'audit'], queryFn: () => adminApi.audit(60) })
  if (audit.isLoading) return <p className="text-vigno-muted text-sm">Loading activity…</p>
  if (audit.isError) return <p className="text-red-300 text-sm">Failed to load activity.</p>
  return (
    <div className="max-h-[28rem] overflow-auto rounded-lg border border-vigno-line/40">
      <table className="w-full text-sm">
        <thead className="bg-vigno-bg2/80 text-vigno-muted text-xs sticky top-0 border-b border-vigno-line/40">
          <tr>
            <th className="text-left px-4 py-2.5 font-semibold tracking-wide">Action</th>
            <th className="text-left px-4 py-2.5 font-semibold tracking-wide">Target</th>
            <th className="text-left px-4 py-2.5 font-semibold tracking-wide">Time</th>
          </tr>
        </thead>
        <tbody>
          {audit.data.map((l, i) => (
            <tr key={l._id} className={'border-t border-vigno-line/30 ' + (i % 2 === 0 ? '' : 'bg-white/2')}>
              <td className="px-4 py-2 font-mono text-xs text-vigno-accent2">{l.action}</td>
              <td className="px-4 py-2 text-vigno-muted text-xs">{[l.targetType, l.targetId].filter(Boolean).join(' ')}</td>
              <td className="px-4 py-2 text-vigno-muted text-xs">{new Date(l.time).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function GlobalUploads() {
  const [uploads, setUploads] = useState({})
  useEffect(() => subscribeUploads(setUploads), [])
  const active = Object.entries(uploads).filter(([, u]) => u.status === 'uploading' || u.status === 'processing')
  useEffect(() => {
    if (!active.length) return
    const warn = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [active.length])
  if (!active.length) return null
  return (
    <div className="mb-6 rounded-xl border border-vigno-accent/30 bg-vigno-accent/8 p-4 flex flex-col gap-2">
      {active.map(([id, u]) => (
        <div key={id} className="flex items-center gap-3 text-sm">
          <span className="text-vigno-accent">↑</span>
          <span className="flex-1 truncate text-vigno-txt">{u.title || 'Uploading…'}</span>
          <div className="h-1.5 w-32 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-vigno-accent rounded-full transition-all duration-300" style={{ width: `${Math.min(u.pct, 100)}%` }} />
          </div>
          <span className="text-vigno-muted text-xs w-20 text-right tabular-nums">{u.pct < 100 ? `${u.pct}%` : 'Processing…'}</span>
        </div>
      ))}
      <p className="text-[11px] text-vigno-muted mt-1">Uploads continue while you navigate — do not close this tab.</p>
    </div>
  )
}

function Panel({ title, children }) {
  return (
    <section className="bg-vigno-card border border-vigno-line/50 rounded-xl p-6 mb-6">
      <h2 className="text-sm font-semibold text-vigno-txt mb-4 flex items-center gap-2">
        <span className="w-1 h-4 rounded-full bg-vigno-accent inline-block" />
        {title}
      </h2>
      {children}
    </section>
  )
}

const TABS = [
  { key: 'overview',  label: 'Overview',       icon: <OverviewIcon /> },
  { key: 'content',   label: 'Content (CMS)',  icon: <ContentTabIcon /> },
  { key: 'users',     label: 'Manage Users',   icon: <UsersTabIcon /> },
  { key: 'reports',   label: 'Reports',        icon: <ReportsIcon /> },
  { key: 'commerce',  label: 'Commerce',       icon: <CommerceIcon /> },
  { key: 'licenses',  label: 'Licenses',       icon: <LicenseTabIcon /> },
  { key: 'settings',  label: 'Site Settings',  icon: <SettingsIcon /> },
  { key: 'audit',     label: 'Audit',          icon: <AuditIcon /> },
]

export default function AdminDashboard() {
  const [tab, setTab] = useState('overview')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex gap-0 min-h-[calc(100vh-3.5rem)]">

      {/* Admin sidebar */}
      <aside className={
        'transition-all duration-200 shrink-0 ' +
        (sidebarOpen ? 'w-52' : 'w-14')
      }>
        <div className="sticky top-0 bg-vigno-panel border-r border-vigno-line/40 min-h-full pt-1 pb-6">

          {/* Sidebar header */}
          <div className="flex items-center justify-between px-3 py-3 border-b border-vigno-line/30 mb-2">
            {sidebarOpen && (
              <span className="text-xs font-semibold text-vigno-muted uppercase tracking-widest">Admin</span>
            )}
            <button
              onClick={() => setSidebarOpen((o) => !o)}
              className="w-7 h-7 grid place-items-center rounded-md hover:bg-white/10 text-vigno-muted hover:text-vigno-txt transition-colors ml-auto"
              title={sidebarOpen ? 'Collapse' : 'Expand'}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                {sidebarOpen
                  ? <path d="M8 2.5L4.5 6.5 8 10.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  : <path d="M5 2.5L8.5 6.5 5 10.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                }
              </svg>
            </button>
          </div>

          {/* Nav items */}
          <nav className="flex flex-col gap-0.5 px-2">
            {TABS.map((t) => {
              const isActive = tab === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  title={!sidebarOpen ? t.label : undefined}
                  className={
                    'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all duration-100 text-left ' +
                    (isActive
                      ? 'bg-vigno-accent/15 text-vigno-accent font-medium border-l-2 border-vigno-accent'
                      : 'text-vigno-muted hover:text-vigno-txt hover:bg-white/8 border-l-2 border-transparent')
                  }
                >
                  <span className="shrink-0 w-4 h-4 flex items-center justify-center">{t.icon}</span>
                  {sidebarOpen && <span className="truncate">{t.label}</span>}
                </button>
              )
            })}
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 p-6">
        <Breadcrumb trail="Admin" />

        {/* Page header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-lg bg-vigno-accent/15 flex items-center justify-center text-vigno-accent">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93A10 10 0 1 0 4.93 19.07 10 10 0 0 0 19.07 4.93z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-vigno-txt leading-tight">Admin Dashboard</h1>
            <p className="text-xs text-vigno-muted mt-0.5">{TABS.find(t => t.key === tab)?.label}</p>
          </div>
        </div>

        <GlobalUploads />

        {tab === 'overview' && <div className="mb-6"><Overview /></div>}
        {tab === 'content'  && <Panel title="Content Tree Manager"><CmsManager /></Panel>}
        {tab === 'users'    && <Panel title="Manage Users"><UsersPanel /></Panel>}
        {tab === 'reports'  && <Panel title="Reports & Export"><ReportsPanel /></Panel>}
        {tab === 'commerce' && <Panel title="Coupons & Refunds"><CommercePanel /></Panel>}
        {tab === 'licenses' && <Panel title="Revoke License"><RevokeLicense /></Panel>}
        {tab === 'settings' && <Panel title="Site Settings — Footer & Branding"><SettingsPanel /></Panel>}
        {tab === 'audit'    && <Panel title="Recent Activity (Audit Log)"><AuditLog /></Panel>}
      </div>
    </div>
  )
}

// ── Admin panel tab icons ─────────────────────────────────────────────────────
function OverviewIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> }
function ContentTabIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> }
function UsersTabIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> }
function ReportsIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> }
function CommerceIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> }
function LicenseTabIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> }
function SettingsIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93A10 10 0 1 0 4.93 19.07 10 10 0 0 0 19.07 4.93z"/></svg> }
function AuditIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> }

// ── Stat card icons ───────────────────────────────────────────────────────────
function UsersIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> }
function ContentIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> }
function PurchaseIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg> }
function LicenseIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> }
function RevenueIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> }
