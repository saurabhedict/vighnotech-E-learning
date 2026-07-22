import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../api/adminApi'
import { apiErrorMessage } from '../../api/authApi'
import { subscribeUploads } from '../../lib/uploadManager'
import CmsManager from './CmsManager'
import UsersPanel from './UsersPanel'
import ReportsPanel from './ReportsPanel'
import CommercePanel from './CommercePanel'
import SettingsPanel from './SettingsPanel'


// ── Shared style helpers ──────────────────────────────────────────────────────
const inp = 'px-3 py-2 rounded-lg bg-vigno-bg2 border border-vigno-line/60 text-sm outline-none focus:border-vigno-accent text-vigno-txt transition-colors w-full'
const btnCls = {
  primary: 'bg-vigno-accent hover:bg-vigno-accent/90 text-vigno-bg1 font-semibold px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
  danger:  'bg-red-500/80 hover:bg-red-500 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
  ghost:   'border border-vigno-line/60 hover:border-vigno-accent/40 text-vigno-muted hover:text-vigno-txt px-4 py-2 rounded-lg text-sm transition-colors',
}

// ── StatCard ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon }) {
  return (
    <div className="bg-vigno-card border border-vigno-line/60 rounded-xl px-5 h-28 flex flex-col pt-4 pb-3 relative overflow-hidden hover:border-vigno-accent/30 transition-all duration-200">
      <div className="flex items-center gap-2">
        {icon && (
          <div className="w-7 h-7 rounded-full bg-vigno-accent/10 flex items-center justify-center text-vigno-accent shrink-0">
            {icon}
          </div>
        )}
        <div className="text-[11px] font-extrabold text-vigno-accent uppercase tracking-wider leading-none whitespace-nowrap">{label}</div>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-2xl font-bold text-vigno-txt tracking-tight leading-none">{value ?? '0'}</div>
      </div>
      {/* Bottom accent stripe */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-vigno-accent" />
    </div>
  )
}

// ── Overview ──────────────────────────────────────────────────────────────────
function Overview() {
  const stats = useQuery({ queryKey: ['admin', 'stats'], queryFn: adminApi.stats })
  if (stats.isLoading) return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {[...Array(5)].map((_, i) => <div key={i} className="h-28 rounded-xl bg-vigno-card border border-vigno-line/40 animate-pulse" />)}
    </div>
  )
  if (stats.isError) return <p className="text-red-300 text-sm">Failed to load stats.</p>
  const s = stats.data
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      <StatCard label="Users"           value={s.users}          icon={<UsersIcon />} />
      <StatCard label="Content Items"   value={s.contents}       icon={<ContentIcon />} />
      <StatCard label="Purchases"       value={s.purchases}      icon={<PurchaseIcon />} />
      <StatCard label="Active Licenses" value={s.activeLicenses} icon={<LicenseIcon />} />
      <StatCard label="Revenue (₹)"     value={s.revenue}        icon={<RevenueIcon />} />
    </div>
  )
}

// ── RevokeLicense ─────────────────────────────────────────────────────────────
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
  return (
    <div>
      <p className="text-sm text-vigno-muted mb-4">Revoke a license for refund or fraud cases. Takes effect on the user's next verification.</p>
      {msg && <p className={'text-sm mb-3 px-3 py-2 rounded-lg ' + (msg.ok ? 'text-green-300 bg-green-500/10 border border-green-500/20' : 'text-red-300 bg-red-500/10 border border-red-500/20')}>{msg.text}</p>}
      <div className="flex flex-wrap gap-2 items-center">
        <input placeholder="License ID (lic_…)" value={jti} onChange={(e) => setJti(e.target.value)} className={inp + ' flex-1 min-w-[200px] font-mono text-xs'} />
        <select value={reason} onChange={(e) => setReason(e.target.value)} className={inp + ' w-auto'}>
          <option value="refund">Refund</option>
          <option value="fraud">Fraud</option>
          <option value="admin_revoke">Admin Revoke</option>
        </select>
        <button onClick={revoke} disabled={!jti.trim()} className={btnCls.danger}>Revoke License</button>
      </div>
    </div>
  )
}

// ── NotificationsPanel (admin → everyone broadcasts) ──────────────────────────
function NotificationsPanel() {
  const qc = useQueryClient()
  const { data: items, isLoading } = useQuery({ queryKey: ['admin', 'notifications'], queryFn: adminApi.listNotifications })
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [link, setLink] = useState('')
  const [level, setLevel] = useState('info')
  const [msg, setMsg] = useState(null)
  const [sending, setSending] = useState(false)

  const send = async (e) => {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return
    setSending(true); setMsg(null)
    try {
      await adminApi.createNotification({ title: title.trim(), body: body.trim(), link: link.trim() || undefined, level })
      setTitle(''); setBody(''); setLink(''); setLevel('info')
      setMsg({ ok: true, text: 'Notification broadcast to everyone.' })
      qc.invalidateQueries({ queryKey: ['admin', 'notifications'] })
    } catch (err) { setMsg({ ok: false, text: apiErrorMessage(err, 'Failed to send') }) }
    finally { setSending(false) }
  }
  const del = async (id) => {
    try { await adminApi.deleteNotification(id); qc.invalidateQueries({ queryKey: ['admin', 'notifications'] }) } catch { /* ignore */ }
  }
  return (
    <div className="space-y-6">
      <form onSubmit={send} className="space-y-3 max-w-2xl">
        <p className="text-sm text-vigno-muted">Broadcast an announcement or instruction — it shows up in every user's notification bell.</p>
        {msg && <p className={'text-sm px-3 py-2 rounded-lg ' + (msg.ok ? 'text-green-300 bg-green-500/10 border border-green-500/20' : 'text-red-300 bg-red-500/10 border border-red-500/20')}>{msg.text}</p>}
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" maxLength={140} className={inp} />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message / instruction to all users" rows={4} maxLength={2000} className={inp} />
        <div className="flex flex-wrap gap-2 items-center">
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Optional link (e.g. /app/library)" className={inp + ' flex-1 min-w-[220px]'} />
          <select value={level} onChange={(e) => setLevel(e.target.value)} className={inp + ' w-auto'}>
            <option value="info">Info</option>
            <option value="success">Success</option>
            <option value="warning">Warning</option>
          </select>
          <button type="submit" disabled={sending || !title.trim() || !body.trim()} className={btnCls.primary}>{sending ? 'Sending…' : 'Send to Everyone'}</button>
        </div>
      </form>

      <div>
        <h3 className="text-sm font-bold text-vigno-txt mb-2">Sent notifications</h3>
        {isLoading && <p className="text-sm text-vigno-muted">Loading…</p>}
        {items?.length === 0 && <p className="text-sm text-vigno-muted">Nothing sent yet.</p>}
        <ul className="space-y-2">
          {items?.map((n) => (
            <li key={n.id} className="flex items-start justify-between gap-3 bg-vigno-bg2 border border-vigno-line/50 rounded-lg px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-vigno-txt">{n.title} <span className="text-[10px] font-normal text-vigno-muted uppercase">· {n.level}</span></p>
                <p className="text-xs text-vigno-muted whitespace-pre-line break-words">{n.body}</p>
                <p className="text-[10px] text-vigno-muted mt-1">{new Date(n.createdAt).toLocaleString()}{n.link ? ` · ${n.link}` : ''}</p>
              </div>
              <button onClick={() => del(n.id)} className="text-red-400 hover:text-red-300 text-xs font-semibold shrink-0">Delete</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ── LicensesPanel (all licenses on the platform + actions) ────────────────────
const LIC_STATUS_CLS = { active: 'bg-green-500/15 text-green-300', revoked: 'bg-red-500/15 text-red-300' }
function LicensesPanel() {
  const qc = useQueryClient()
  const [status, setStatus] = useState('all')
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [msg, setMsg] = useState(null)
  const { data: items, isLoading } = useQuery({
    queryKey: ['admin', 'licenses', status, search],
    queryFn: () => adminApi.listLicenses({ ...(status !== 'all' ? { status } : {}), ...(search ? { q: search } : {}) }),
  })
  const revoke = async (jti) => {
    const reason = window.prompt('Reason for revoking this license?', 'admin_revoke')
    if (reason === null) return
    setMsg(null)
    try { await adminApi.revokeLicense(jti, reason || 'admin_revoke'); setMsg({ ok: true, text: `Revoked ${jti}` }); qc.invalidateQueries({ queryKey: ['admin', 'licenses'] }) }
    catch (e) { setMsg({ ok: false, text: apiErrorMessage(e, 'Revoke failed') }) }
  }
  const unflag = async (jti) => {
    setMsg(null)
    try { await adminApi.unflagLicense(jti); qc.invalidateQueries({ queryKey: ['admin', 'licenses'] }) }
    catch (e) { setMsg({ ok: false, text: apiErrorMessage(e, 'Unflag failed') }) }
  }
  const FILTERS = ['all', 'active', 'revoked', 'flagged']
  return (
    <div className="space-y-4">
      <p className="text-sm text-vigno-muted">Every license issued on the platform. Revoke takes effect on the user's next content access.</p>
      {msg && <p className={'text-sm px-3 py-2 rounded-lg ' + (msg.ok ? 'text-green-300 bg-green-500/10 border border-green-500/20' : 'text-red-300 bg-red-500/10 border border-red-500/20')}>{msg.text}</p>}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1 flex-wrap">
          {FILTERS.map((s) => (
            <button key={s} onClick={() => setStatus(s)} className={'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ' + (status === s ? 'bg-vigno-accent text-vigno-accent-txt' : 'bg-white/10 text-vigno-muted hover:text-vigno-txt')}>
              {s[0].toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); setSearch(q.trim()) }} className="flex gap-2 flex-1 min-w-[220px]">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search user email / name" className={inp + ' flex-1'} />
          <button className={btnCls.ghost}>Search</button>
        </form>
      </div>

      {isLoading ? <p className="text-sm text-vigno-muted">Loading…</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-xs text-vigno-muted border-b border-vigno-line/40">
                <th className="py-2 pr-3 font-semibold">User</th>
                <th className="py-2 pr-3 font-semibold">Content</th>
                <th className="py-2 pr-3 font-semibold">Type</th>
                <th className="py-2 pr-3 font-semibold">Status</th>
                <th className="py-2 pr-3 font-semibold">Access</th>
                <th className="py-2 pr-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items?.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-vigno-muted">No licenses match.</td></tr>}
              {items?.map((l) => (
                <tr key={l.jti} className="border-b border-vigno-line/20 align-top">
                  <td className="py-2 pr-3">
                    <div className="text-vigno-txt">{l.user?.name || '—'}{l.user?.role === 'admin' && <span className="ml-1 text-[9px] text-vigno-accent">(admin)</span>}</div>
                    <div className="text-[11px] text-vigno-muted">{l.user?.email || '—'}</div>
                  </td>
                  <td className="py-2 pr-3">
                    <div className="text-vigno-txt">{l.content?.title || '—'}</div>
                    <div className="text-[11px] text-vigno-muted">{l.content?.courseKey || ''}</div>
                  </td>
                  <td className="py-2 pr-3 text-vigno-muted">{l.type}</td>
                  <td className="py-2 pr-3">
                    <span className={'px-2 py-0.5 rounded text-[10px] font-bold ' + (LIC_STATUS_CLS[l.status] || 'bg-white/10 text-vigno-muted')}>{l.status}</span>
                    {l.flagged && <span className="ml-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300" title={l.flaggedReason}>flagged</span>}
                  </td>
                  <td className="py-2 pr-3 text-xs whitespace-nowrap">
                    {l.status === 'revoked' ? (
                      <span className="text-vigno-muted">Revoked {l.revokedReason ? `(${l.revokedReason})` : ''}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-vigno-accent2 font-semibold">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Lifetime
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    <div className="flex gap-3">
                      {l.status !== 'revoked' && <button onClick={() => revoke(l.jti)} className="text-red-400 hover:text-red-300 text-xs font-semibold">Revoke</button>}
                      {l.flagged && <button onClick={() => unflag(l.jti)} className="text-amber-300 hover:text-amber-200 text-xs font-semibold">Unflag</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <details className="mt-2">
        <summary className="text-xs text-vigno-muted cursor-pointer hover:text-vigno-txt">Revoke by License ID…</summary>
        <div className="mt-3"><RevokeLicense /></div>
      </details>
    </div>
  )
}

// ── FiltersPanel (dynamic categories to classify courses) ────────────────────
function FiltersPanel() {
  const qc = useQueryClient()
  const { data: cats, isLoading } = useQuery({ queryKey: ['admin', 'filters'], queryFn: adminApi.listFilters })
  const [newCat, setNewCat] = useState('')
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'filters'] })

  const addCategory = async (e) => {
    e.preventDefault()
    if (!newCat.trim()) return
    setBusy(true); setMsg(null)
    try { await adminApi.createFilterCategory({ name: newCat.trim() }); setNewCat(''); refresh() }
    catch (err) { setMsg({ ok: false, text: apiErrorMessage(err, 'Failed to add category') }) }
    finally { setBusy(false) }
  }
  const delCategory = async (id) => {
    if (!window.confirm('Delete this filter category and all its options?')) return
    try { await adminApi.deleteFilterCategory(id); refresh() } catch (err) { setMsg({ ok: false, text: apiErrorMessage(err, 'Delete failed') }) }
  }
  const addOption = async (id, label, reset) => {
    if (!label.trim()) return
    try { await adminApi.addFilterOption(id, label.trim()); reset(); refresh() }
    catch (err) { setMsg({ ok: false, text: apiErrorMessage(err, 'Failed to add option') }) }
  }
  const removeOption = async (id, optionId) => {
    try { await adminApi.removeFilterOption(id, optionId); refresh() } catch (err) { setMsg({ ok: false, text: apiErrorMessage(err, 'Failed') }) }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-vigno-muted">Filters classify courses. On the catalog, users get one multi-select dropdown per category — pick options, hit Apply, and see matching courses. Create as many categories and options as you need.</p>
      {msg && <p className={'text-sm px-3 py-2 rounded-lg ' + (msg.ok ? 'text-green-300 bg-green-500/10 border border-green-500/20' : 'text-red-300 bg-red-500/10 border border-red-500/20')}>{msg.text}</p>}

      <form onSubmit={addCategory} className="flex gap-2 max-w-md">
        <input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="New filter category (e.g. Difficulty)" className={inp + ' flex-1'} />
        <button disabled={busy || !newCat.trim()} className={btnCls.primary}>Add Category</button>
      </form>

      {isLoading && <p className="text-sm text-vigno-muted">Loading…</p>}
      {cats?.length === 0 && <p className="text-sm text-vigno-muted">No filter categories yet.</p>}
      <div className="space-y-3">
        {cats?.map((cat) => (
          <FilterCategoryCard key={cat.id} cat={cat}
            onDelete={() => delCategory(cat.id)}
            onAddOption={(label, reset) => addOption(cat.id, label, reset)}
            onRemoveOption={(oid) => removeOption(cat.id, oid)} />
        ))}
      </div>
    </div>
  )
}

function FilterCategoryCard({ cat, onDelete, onAddOption, onRemoveOption }) {
  const [label, setLabel] = useState('')
  return (
    <div className="bg-vigno-bg2 border border-vigno-line/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-vigno-txt">{cat.name}</h3>
        <button onClick={onDelete} className="text-red-400 hover:text-red-300 text-xs font-semibold">Delete category</button>
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        {cat.options.length === 0 && <span className="text-xs text-vigno-muted">No options yet — add some below.</span>}
        {cat.options.map((o) => (
          <span key={o.id} className="inline-flex items-center gap-1.5 bg-vigno-accent/10 border border-vigno-accent/25 text-vigno-txt text-xs px-2.5 py-1 rounded-full">
            {o.label}
            <button onClick={() => onRemoveOption(o.id)} className="text-vigno-muted hover:text-red-400 leading-none" title="Remove option">✕</button>
          </span>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); onAddOption(label, () => setLabel('')) }} className="flex gap-2">
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Add option…" className={inp + ' flex-1 max-w-xs'} />
        <button className={btnCls.ghost}>Add option</button>
      </form>
    </div>
  )
}

// ── AuditLog ──────────────────────────────────────────────────────────────────
function AuditLog() {
  const queryClient = useQueryClient()
  const audit = useQuery({ queryKey: ['admin', 'audit'], queryFn: () => adminApi.audit(60) })
  const [clearing, setClearing] = useState(false)

  const handleClear = async () => {
    if (!window.confirm("Are you sure you want to clear the entire audit log? This action cannot be undone.")) return
    setClearing(true)
    try {
      await adminApi.clearAudit()
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit'] })
    } catch (err) {
      alert("Failed to clear audit log.")
    } finally {
      setClearing(false)
    }
  }

  if (audit.isLoading) return <p className="text-vigno-muted text-sm">Loading activity…</p>
  if (audit.isError) return <p className="text-red-300 text-sm">Failed to load activity.</p>

  const hasLogs = audit.data && audit.data.length > 0

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={handleClear}
          disabled={clearing || !hasLogs}
          className={btnCls.danger}
        >
          {clearing ? 'Clearing…' : 'Clear Audit Log'}
        </button>
      </div>

      <div className="max-h-[28rem] overflow-auto rounded-lg border border-vigno-line/40">
        <table className="w-full text-sm">
          <thead className="bg-vigno-bg2 text-vigno-muted text-xs sticky top-0 z-10 border-b border-vigno-line/40">
            <tr>
              <th className="bg-vigno-bg2 text-left px-4 py-2.5 font-semibold tracking-wide">Action</th>
              <th className="bg-vigno-bg2 text-left px-4 py-2.5 font-semibold tracking-wide">Target</th>
              <th className="bg-vigno-bg2 text-left px-4 py-2.5 font-semibold tracking-wide">Time</th>
            </tr>
          </thead>
          <tbody>
            {!hasLogs ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-vigno-muted text-xs">
                  No activity logs recorded yet.
                </td>
              </tr>
            ) : (
              audit.data.map((l, i) => (
                <tr key={l._id} className={'border-t border-vigno-line/30 ' + (i % 2 === 0 ? '' : 'bg-white/2')}>
                  <td className="px-4 py-2 font-mono text-xs text-vigno-accent2">{l.action}</td>
                  <td className="px-4 py-2 text-vigno-muted text-xs">{[l.targetType, l.targetId].filter(Boolean).join(' ')}</td>
                  <td className="px-4 py-2 text-vigno-muted text-xs">{new Date(l.time).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── GlobalUploads ─────────────────────────────────────────────────────────────
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

// ═══════════════════════════════════════════════════════════════════════════════
// ── MANAGE COURSES PANEL (merged Courses + CMS) ───────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

// Resource types — same as what CMS folder items support
const RESOURCE_TYPES = [
  {
    key: 'video',
    label: 'Video',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
    accept: 'video/*',
    hint: 'MP4, WebM, MOV'
  },
  {
    key: 'pdf',
    label: 'PDF',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    accept: 'application/pdf',
    hint: 'PDF documents'
  },
  {
    key: 'animation',
    label: 'Animation',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21m0 0l-.813-5.096L9 21zm0 0h6m-6 0H3m12 0a9 9 0 11-9-9m9 9c.99 0 1.92-.32 2.68-.865" />
      </svg>
    ),
    accept: '.json,.lottie,video/mp4',
    hint: 'Lottie JSON / MP4'
  },
  {
    key: 'image',
    label: 'Image',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
    ),
    accept: 'image/*',
    hint: 'PNG, JPG, SVG, WebP'
  },
  {
    key: 'audio',
    label: 'Audio',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
      </svg>
    ),
    accept: 'audio/*',
    hint: 'MP3, WAV, OGG'
  },
  {
    key: 'subtitle',
    label: 'Subtitle',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M5.625 9h12.75L21 12v6a2.25 2.25 0 01-2.25 2.25H5.625A2.25 2.25 0 013.375 18V12c0-1.657 1.007-3 2.25-3z" />
      </svg>
    ),
    accept: '.vtt,.srt',
    hint: 'VTT or SRT file'
  },
  {
    key: 'quiz',
    label: 'Quiz',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    accept: null,
    hint: 'JSON quiz definition'
  },
  {
    key: 'link',
    label: 'External Link',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622a4.5 4.5 0 01-1.242-7.244l4.5-4.5a4.5 4.5 0 016.364 6.364l-1.757 1.757" />
      </svg>
    ),
    accept: null,
    hint: 'URL to external resource'
  },
]

// Toggle switch helper
function Toggle({ on, onChange, label }) {
  return (
    <div className="flex items-center justify-between">
      {label && <span className="text-sm text-vigno-txt">{label}</span>}
      <button
        onClick={() => onChange(!on)}
        className={'w-10 h-5 rounded-full transition-colors shrink-0 ' + (on ? 'bg-vigno-accent' : 'bg-vigno-line/60')}
      >
        <span className={'block w-4 h-4 rounded-full bg-white shadow transition-transform mx-0.5 ' + (on ? 'translate-x-5' : 'translate-x-0')} />
      </button>
    </div>
  )
}

// ── Resource Options — same options available in CMS folder item uploads ──────
function ResourceOptions({ opts, onChange }) {
  const set = (key, val) => onChange({ ...opts, [key]: val })
  return (
    <div className="mt-3 rounded-lg border border-vigno-line/40 bg-vigno-bg2/40 p-4 flex flex-col gap-3">
      <p className="text-[11px] font-semibold text-vigno-muted uppercase tracking-widest mb-1">Resource Options</p>
      <Toggle label="Free preview"  on={opts.freePreview}  onChange={v => set('freePreview', v)} />
      <Toggle label="Downloadable"  on={opts.downloadable} onChange={v => set('downloadable', v)} />
      <div>
        <label className="text-xs text-vigno-muted mb-1 block">Description / notes</label>
        <textarea rows={2} value={opts.description || ''} onChange={e => set('description', e.target.value)}
          placeholder="Optional description shown to learners…" className={inp + ' resize-none text-xs'} />
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-xs text-vigno-muted mb-1 block">Duration (mm:ss)</label>
          <input value={opts.duration || ''} onChange={e => set('duration', e.target.value)}
            placeholder="12:34" className={inp + ' text-xs'} />
        </div>
        <div className="w-24">
          <label className="text-xs text-vigno-muted mb-1 block">Sort order</label>
          <input type="number" value={opts.order ?? ''} onChange={e => set('order', e.target.value)}
            placeholder="0" className={inp + ' text-xs'} />
        </div>
      </div>
    </div>
  )
}

// ── Resource upload form — used inside chapter AND as standalone ───────────────
function ResourceUploadForm({ onSave, onCancel, initialType = 'video' }) {
  const [type, setType]         = useState(initialType)
  const [title, setTitle]       = useState('')
  const [file, setFile]         = useState(null)
  const [url, setUrl]           = useState('')
  const [quizJson, setQuizJson] = useState('')
  const [opts, setOpts]         = useState({ freePreview: false, downloadable: false, description: '', duration: '', order: 0 })
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState(null)
  const fileRef                 = useRef()
  const rtype                   = RESOURCE_TYPES.find(r => r.key === type)

  const reset = () => {
    setTitle(''); setFile(null); setUrl(''); setQuizJson('')
    setOpts({ freePreview: false, downloadable: false, description: '', duration: '', order: 0 })
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleSave = async () => {
    if (!title.trim()) return setMsg({ ok: false, text: 'Title is required.' })
    if (type === 'link' && !url.trim()) return setMsg({ ok: false, text: 'URL is required.' })
    if (type === 'quiz' && !quizJson.trim()) return setMsg({ ok: false, text: 'Quiz JSON is required.' })
    if (!['link', 'quiz'].includes(type) && !file) return setMsg({ ok: false, text: 'Please select a file.' })
    setSaving(true); setMsg(null)
    try {
      await onSave({ type, title: title.trim(), file, url: url.trim(), quizJson, opts })
      setMsg({ ok: true, text: 'Resource saved!' })
      reset()
    } catch (e) { setMsg({ ok: false, text: apiErrorMessage(e, 'Save failed') }) }
    setSaving(false)
  }

  return (
    <div className="rounded-xl border border-vigno-line/50 bg-vigno-card p-5 flex flex-col gap-4">
      {/* Type selector */}
      <div>
        <label className="text-[11px] text-vigno-muted mb-2 block font-semibold uppercase tracking-widest">Resource type</label>
        <div className="flex flex-wrap gap-1.5">
          {RESOURCE_TYPES.map(r => (
            <button key={r.key} onClick={() => setType(r.key)}
              className={'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ' +
                (type === r.key ? 'bg-vigno-accent/15 border-vigno-accent text-vigno-accent' : 'border-vigno-line/50 text-vigno-muted hover:text-vigno-txt hover:border-vigno-accent/40')}>
              {r.icon} {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="text-xs text-vigno-muted mb-1 block">Title <span className="text-red-400">*</span></label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder={`${rtype.label} title…`} className={inp} />
      </div>

      {/* File / URL / Quiz */}
      {type === 'link' ? (
        <div>
          <label className="text-xs text-vigno-muted mb-1 block">URL <span className="text-red-400">*</span></label>
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" className={inp} />
        </div>
      ) : type === 'quiz' ? (
        <div>
          <label className="text-xs text-vigno-muted mb-1 block">Quiz JSON <span className="text-red-400">*</span></label>
          <textarea rows={5} value={quizJson} onChange={e => setQuizJson(e.target.value)}
            placeholder={'{\n  "questions": [...]\n}'} className={inp + ' resize-y font-mono text-xs'} />
        </div>
      ) : (
        <div>
          <label className="text-xs text-vigno-muted mb-1 block">
            File <span className="text-red-400">*</span> <span className="text-vigno-muted/60">({rtype.hint})</span>
          </label>
          <div onClick={() => fileRef.current?.click()}
            className={'border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors ' +
              (file ? 'border-vigno-accent/60 bg-vigno-accent/5' : 'border-vigno-line/50 hover:border-vigno-accent/40 bg-vigno-bg2/30')}>
            <div className="text-2xl mb-1">{rtype.icon}</div>
            {file
              ? <p className="text-sm text-vigno-accent font-medium">{file.name}<br /><span className="text-vigno-muted text-xs">{(file.size / 1024 / 1024).toFixed(2)} MB</span></p>
              : <p className="text-sm text-vigno-muted">Click to choose · <span className="text-xs">{rtype.hint}</span></p>}
          </div>
          <input ref={fileRef} type="file" accept={rtype.accept} className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
        </div>
      )}

      <ResourceOptions opts={opts} onChange={setOpts} />

      {msg && (
        <p className={'text-sm px-3 py-2 rounded-lg ' + (msg.ok ? 'text-green-300 bg-green-500/10 border border-green-500/20' : 'text-red-300 bg-red-500/10 border border-red-500/20')}>
          {msg.text}
        </p>
      )}

      <div className="flex gap-2 justify-end">
        {onCancel && <button onClick={onCancel} className={btnCls.ghost}>Cancel</button>}
        <button onClick={handleSave} disabled={saving} className={btnCls.primary}>
          {saving ? 'Saving…' : 'Save Resource'}
        </button>
      </div>
    </div>
  )
}

// ── Chapter editor ────────────────────────────────────────────────────────────
function ChapterEditor({ chapter, index, onChange, onRemove }) {
  const [addingResource, setAddingResource] = useState(false)

  const handleResourceSave = async (resourceData) => {
    const newResource = { id: Date.now().toString(), ...resourceData, createdAt: new Date().toISOString() }
    onChange({ ...chapter, resources: [...(chapter.resources || []), newResource] })
    setAddingResource(false)
  }

  const removeResource = (rId) =>
    onChange({ ...chapter, resources: chapter.resources.filter(r => r.id !== rId) })

  return (
    <div className="rounded-lg border border-vigno-line/40 bg-vigno-bg2/30 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-vigno-panel/50 border-b border-vigno-line/30">
        <span className="text-xs font-bold text-vigno-muted w-5 text-center shrink-0">{index + 1}</span>
        <input value={chapter.title} onChange={e => onChange({ ...chapter, title: e.target.value })}
          placeholder="Chapter title…"
          className="flex-1 bg-transparent text-sm font-medium text-vigno-txt outline-none placeholder:text-vigno-muted/50" />
        <button onClick={onRemove}
          className="text-vigno-muted hover:text-red-400 transition-colors text-xs px-2 py-1 rounded hover:bg-red-500/10">
          Remove
        </button>
      </div>

      {chapter.resources?.length > 0 && (
        <div className="divide-y divide-vigno-line/20">
          {chapter.resources.map(r => {
            const rt = RESOURCE_TYPES.find(x => x.key === r.type) || RESOURCE_TYPES[0]
            return (
              <div key={r.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/3 transition-colors group">
                <span className="text-base shrink-0">{rt.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-vigno-txt truncate">{r.title}</p>
                  <p className="text-xs text-vigno-muted">
                    {rt.label}
                    {r.opts?.freePreview ? ' · Free preview' : ''}
                    {r.opts?.duration ? ` · ${r.opts.duration}` : ''}
                    {r.opts?.downloadable ? ' · ↓' : ''}
                  </p>
                </div>
                <button onClick={() => removeResource(r.id)}
                  className="opacity-0 group-hover:opacity-100 text-vigno-muted hover:text-red-400 transition-all text-xs px-2 py-1 rounded hover:bg-red-500/10">
                  ✕
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div className="p-3">
        {addingResource
          ? <ResourceUploadForm onSave={handleResourceSave} onCancel={() => setAddingResource(false)} />
          : (
            <button onClick={() => setAddingResource(true)}
              className="w-full border border-dashed border-vigno-line/40 hover:border-vigno-accent/40 rounded-lg py-2.5 text-sm text-vigno-muted hover:text-vigno-accent transition-colors flex items-center justify-center gap-2">
              + Add resource to chapter
            </button>
          )}
      </div>
    </div>
  )
}

// ── CreateCourseForm ──────────────────────────────────────────────────────────
function CreateCourseForm({ onSaved, onCancel }) {
  const [step, setStep]           = useState(1)
  const [title, setTitle]         = useState('')
  const [description, setDesc]    = useState('')
  const [category, setCategory]   = useState('')
  const [price, setPrice]         = useState('')
  const [thumbnail, setThumb]     = useState(null)
  const [tags, setTags]           = useState('')
  const [isFree, setIsFree]       = useState(false)
  const [published, setPublished] = useState(false)
  const [chapters, setChapters]   = useState([{ id: '1', title: 'Introduction', resources: [] }])
  const [saving, setSaving]       = useState(false)
  const [msg, setMsg]             = useState(null)
  const thumbRef                  = useRef()

  const addChapter = () =>
    setChapters(p => [...p, { id: Date.now().toString(), title: '', resources: [] }])

  const handleSave = async () => {
    if (!title.trim()) return setMsg({ ok: false, text: 'Course title is required.' })
    if (!isFree && !price) return setMsg({ ok: false, text: 'Set a price or mark course as free.' })
    setSaving(true); setMsg(null)
    try {
      await adminApi.createCourse({ title, description, category, price: isFree ? 0 : parseFloat(price), thumbnail, tags: tags.split(',').map(t => t.trim()).filter(Boolean), published, chapters })
      setMsg({ ok: true, text: 'Course created!' })
      onSaved?.()
    } catch (e) { setMsg({ ok: false, text: apiErrorMessage(e, 'Failed to create course') }) }
    setSaving(false)
  }

  return (
    <div>
      {/* Step tabs */}
      <div className="flex gap-1 mb-5 p-1 bg-vigno-bg2/50 rounded-xl w-fit">
        {[{ n: 1, label: 'Details' }, { n: 2, label: 'Chapters & Resources' }].map(s => (
          <button key={s.n} onClick={() => setStep(s.n)}
            className={'px-4 py-1.5 rounded-lg text-sm font-medium transition-all ' +
              (step === s.n ? 'bg-vigno-accent text-vigno-bg1' : 'text-vigno-muted hover:text-vigno-txt')}>
            {s.n}. {s.label}
          </button>
        ))}
      </div>

      {step === 1 && (
        <div className="flex flex-col gap-4 max-w-2xl">
          {/* Thumbnail */}
          <div>
            <label className="text-xs text-vigno-muted mb-2 block">Thumbnail</label>
            <div onClick={() => thumbRef.current?.click()}
              className={'relative w-full aspect-video max-w-xs rounded-xl border-2 border-dashed cursor-pointer overflow-hidden flex items-center justify-center transition-colors ' +
                (thumbnail ? 'border-vigno-accent/50' : 'border-vigno-line/40 hover:border-vigno-accent/40 bg-vigno-bg2/30')}>
              {thumbnail ? (
                <img src={URL.createObjectURL(thumbnail)} className="w-full h-full object-cover" alt="thumb" />
              ) : (
                <div className="text-center p-4">
                  <svg className="w-8 h-8 text-vigno-muted mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                  <p className="text-sm text-vigno-muted">Click to upload<br /><span className="text-xs">16:9 recommended</span></p>
                </div>
              )}
            </div>
            <input ref={thumbRef} type="file" accept="image/*" className="hidden" onChange={e => setThumb(e.target.files?.[0] || null)} />
          </div>

          <div>
            <label className="text-xs text-vigno-muted mb-1 block">Title <span className="text-red-400">*</span></label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Course title…" className={inp} />
          </div>

          <div>
            <label className="text-xs text-vigno-muted mb-1 block">Description</label>
            <textarea rows={3} value={description} onChange={e => setDesc(e.target.value)} placeholder="What will students learn?" className={inp + ' resize-none'} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-vigno-muted mb-1 block">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className={inp}>
                <option value="">Select…</option>
                <option value="development">Development</option>
                <option value="design">Design</option>
                <option value="data-science">Data Science</option>
                <option value="business">Business</option>
                <option value="it-software">IT & Software</option>
                <option value="personal-development">Personal Development</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-vigno-muted mb-1 block">Tags (comma separated)</label>
              <input value={tags} onChange={e => setTags(e.target.value)} placeholder="react, hooks…" className={inp} />
            </div>
          </div>

          <div>
            <label className="text-xs text-vigno-muted mb-2 block">Pricing</label>
            <Toggle label="Free course" on={isFree} onChange={setIsFree} />
            {!isFree && (
              <div className="relative w-36 mt-3">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-vigno-muted text-sm">₹</span>
                <input type="number" min="0" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" className={inp + ' pl-7'} />
              </div>
            )}
          </div>

          <Toggle label={published ? 'Published — visible to students' : 'Draft — hidden from students'} on={published} onChange={setPublished} />

          <button onClick={() => setStep(2)} className={btnCls.primary + ' w-fit'}>Next: Chapters →</button>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-vigno-txt">{chapters.length} Chapter{chapters.length !== 1 ? 's' : ''}</p>
          </div>

          {chapters.map((ch, idx) => (
            <ChapterEditor key={ch.id} chapter={ch} index={idx}
              onChange={(data) => setChapters(p => p.map((c, i) => i === idx ? data : c))}
              onRemove={() => setChapters(p => p.filter((_, i) => i !== idx))} />
          ))}

          <button onClick={addChapter}
            className="border border-dashed border-vigno-line/40 hover:border-vigno-accent/40 rounded-xl py-3 text-sm text-vigno-muted hover:text-vigno-accent transition-colors flex items-center justify-center gap-2">
            + Add Chapter
          </button>

          {msg && (
            <p className={'text-sm px-3 py-2 rounded-lg ' + (msg.ok ? 'text-green-300 bg-green-500/10 border border-green-500/20' : 'text-red-300 bg-red-500/10 border border-red-500/20')}>
              {msg.text}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <button onClick={() => setStep(1)} className={btnCls.ghost}>← Back</button>
            <button onClick={handleSave} disabled={saving} className={btnCls.primary}>
              {saving ? 'Creating…' : '🚀 Create Course'}
            </button>
            {onCancel && <button onClick={onCancel} className={btnCls.ghost}>Cancel</button>}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Course list — uses existing listNodes to fetch courses from the CMS tree ──
// ── ManageCoursesPanel ────────────────────────────────────────────────────────
function ManageCoursesPanel() {
  return (
    <div className="flex flex-col gap-5">
      <CmsManager />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── MAIN ADMIN DASHBOARD ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

function Panel({ title, icon, children }) {
  return (
    <section className="bg-vigno-card border border-vigno-line/50 rounded-xl p-6 mb-6">
      <h2 className="text-sm font-semibold text-vigno-txt mb-4 flex items-center gap-2.5">
        {icon && <span className="text-vigno-accent2 shrink-0 flex items-center justify-center">{icon}</span>}
        {title}
      </h2>
      {children}
    </section>
  )
}

const GROUPS = [
  {
    title: 'Core',
    items: [
      { key: 'overview',        label: 'Overview',        icon: <OverviewIcon /> },
      { key: 'audit',           label: 'Audit Log',       icon: <AuditIcon /> },
    ]
  },
  {
    title: 'Content CMS',
    items: [
      { key: 'manage-courses',  label: 'Manage Courses',  icon: <CoursesTabIcon /> },
      { key: 'users',           label: 'Manage Users',    icon: <UsersTabIcon /> },
    ]
  },
  {
    title: 'Sales & Licenses',
    items: [
      { key: 'reports',         label: 'Reports',         icon: <ReportsIcon /> },
      { key: 'commerce',        label: 'Commerce',        icon: <CommerceIcon /> },
      { key: 'licenses',        label: 'Licenses',        icon: <LicenseTabIcon /> },
    ]
  },
  {
    title: 'Engagement',
    items: [
      { key: 'notifications',   label: 'Notifications',   icon: <BellTabIcon /> },
    ]
  },
  {
    title: 'Settings',
    items: [
      { key: 'settings',        label: 'Site Settings',   icon: <SettingsIcon /> },
    ]
  }
]

const TABS = GROUPS.flatMap(g => g.items)

export default function AdminDashboard() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') || 'overview'
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex gap-0 min-h-[calc(100vh-3.5rem)]">

      {/* Sidebar */}
      <aside className={'transition-all duration-200 shrink-0 ' + (sidebarOpen ? 'w-52' : 'w-14')}>
        <div className="sticky top-0 bg-vigno-panel border-r border-vigno-line/40 min-h-full pt-1 pb-6">
          <div className="flex items-center justify-between px-3 py-3 border-b border-vigno-line/30 mb-2">
            {sidebarOpen && <span className="text-xs font-semibold text-vigno-muted uppercase tracking-widest">Admin</span>}
            <button onClick={() => setSidebarOpen(o => !o)}
              className="w-7 h-7 grid place-items-center rounded-md hover:bg-white/10 text-vigno-muted hover:text-vigno-txt transition-colors ml-auto"
              title={sidebarOpen ? 'Collapse' : 'Expand'}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                {sidebarOpen
                  ? <path d="M8 2.5L4.5 6.5 8 10.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  : <path d="M5 2.5L8.5 6.5 5 10.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>}
              </svg>
            </button>
          </div>

          <nav className="flex flex-col px-2 gap-3">
            {GROUPS.map((g, gIdx) => (
              <div key={gIdx} className="flex flex-col gap-0.5">
                {sidebarOpen ? (
                  <p className="text-[9px] font-extrabold uppercase tracking-widest text-vigno-muted/50 px-2.5 mb-1.5 mt-2 select-none">
                    {g.title}
                  </p>
                ) : (
                  gIdx > 0 && <div className="h-px bg-vigno-line/20 my-2 mx-1" />
                )}
                <div className="flex flex-col gap-0.5">
                  {g.items.map(t => {
                    const isActive = tab === t.key
                    return (
                      <button key={t.key} onClick={() => setSearchParams({ tab: t.key })}
                        title={!sidebarOpen ? t.label : undefined}
                        className={'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all duration-100 text-left border-l-2 ' +
                          (isActive
                            ? 'bg-vigno-accent/15 text-vigno-accent font-semibold border-vigno-accent'
                            : 'text-vigno-muted hover:text-vigno-txt hover:bg-white/8 border-transparent')}>
                        <span className="shrink-0 w-4 h-4 flex items-center justify-center">{t.icon}</span>
                        {sidebarOpen && <span className="truncate">{t.label}</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </aside>

      <div className="flex-1 min-w-0 p-6">
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

        {tab === 'overview'       && <div className="mb-6"><Overview /></div>}
        {tab === 'manage-courses' && <Panel title="Manage Courses — Create, Edit, Resources & CMS" icon={<CoursesTabIcon />}><ManageCoursesPanel /></Panel>}
        {tab === 'users'          && <Panel title="Manage Users" icon={<UsersTabIcon />}><UsersPanel /></Panel>}
        {tab === 'reports'        && <Panel title="Reports & Export" icon={<ReportsIcon />}><ReportsPanel /></Panel>}
        {tab === 'commerce'       && <Panel title="Coupons & Refunds" icon={<CommerceIcon />}><CommercePanel /></Panel>}
        {tab === 'licenses'       && <Panel title="Licenses — All Users & Actions" icon={<LicenseTabIcon />}><LicensesPanel /></Panel>}
        {tab === 'notifications'  && <Panel title="Notifications — Broadcast to Everyone" icon={<BellTabIcon />}><NotificationsPanel /></Panel>}
        {tab === 'settings'       && <Panel title="Site Settings — Footer & Branding" icon={<SettingsIcon />}><SettingsPanel /></Panel>}
        {tab === 'audit'          && <Panel title="Recent Activity (Audit Log)" icon={<AuditIcon />}><AuditLog /></Panel>}
      </div>
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function OverviewIcon()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> }
function CoursesTabIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> }
function UsersTabIcon()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> }
function ReportsIcon()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> }
function CommerceIcon()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> }
function LicenseTabIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> }
function SettingsIcon()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93A10 10 0 1 0 4.93 19.07 10 10 0 0 0 19.07 4.93z"/></svg> }
function AuditIcon()      { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> }
function BellTabIcon()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> }
function FilterTabIcon()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg> }

function UsersIcon()   { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> }
function ContentIcon() { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> }
function PurchaseIcon(){ return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg> }
function LicenseIcon() { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> }
function RevenueIcon() { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> }
