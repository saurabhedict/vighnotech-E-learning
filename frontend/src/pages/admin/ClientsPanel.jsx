import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../api/adminApi'
import { apiErrorMessage } from '../../api/authApi'
import { useClasses } from '../../hooks/useContent'

const input = 'px-3 py-2 rounded-lg bg-vigno-bg2 border border-vigno-line/60 text-sm text-vigno-txt outline-none'
const btn = 'px-4 py-2 rounded-lg bg-vigno-accent text-vigno-bg1 font-bold text-sm hover:brightness-110 disabled:opacity-60'
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '—')
const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10) }

// One client row: grant a course (with validity), see grants, revoke, delete.
function ClientRow({ client, courses, onDeleted }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [courseSlug, setCourseSlug] = useState('')
  const [validity, setValidity] = useState('')
  const [msg, setMsg] = useState(null)

  const grantsQ = useQuery({ queryKey: ['admin', 'client', client.id, 'grants'], queryFn: () => adminApi.listClientGrants(client.id), enabled: open })

  const grant = useMutation({
    mutationFn: () => adminApi.grantCourse(client.id, { courseSlug, expiresAt: validity ? `${validity}T23:59:59` : undefined }),
    onSuccess: (r) => {
      setMsg({ ok: true, text: `Granted "${r.courseName}" (${r.grantedLessons} lessons)${r.expiresAt ? ' until ' + fmtDate(r.expiresAt) : ' (no expiry)'}` })
      setCourseSlug(''); setValidity('')
      qc.invalidateQueries({ queryKey: ['admin', 'client', client.id, 'grants'] })
      qc.invalidateQueries({ queryKey: ['admin', 'clients'] })
    },
    onError: (e) => setMsg({ ok: false, text: apiErrorMessage(e, 'Grant failed') }),
  })
  const revoke = useMutation({
    mutationFn: (slug) => adminApi.revokeGrant(client.id, slug),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'client', client.id, 'grants'] })
      qc.invalidateQueries({ queryKey: ['admin', 'clients'] })
    },
  })

  return (
    <div className="rounded-xl border border-vigno-line/50 bg-vigno-card/40">
      <div className="flex items-center justify-between gap-3 p-3">
        <button onClick={() => setOpen((v) => !v)} className="flex-1 text-left">
          <div className="font-bold text-sm text-vigno-txt">{client.name || '(no name)'} <span className="text-vigno-muted font-normal">· {client.email}</span></div>
          <div className="text-xs text-vigno-muted">{client.activeLicenses} active grant{client.activeLicenses === 1 ? '' : 's'} · added {fmtDate(client.createdAt)}</div>
        </button>
        <button onClick={() => setOpen((v) => !v)} className="text-xs font-semibold text-vigno-accent px-2 py-1">{open ? 'Close' : 'Manage'}</button>
        <button
          onClick={() => { if (window.confirm(`Delete client ${client.email} and all their grants?`)) adminApi.deleteClient(client.id).then(onDeleted) }}
          className="text-xs font-semibold text-red-400 hover:text-red-300 px-2 py-1"
        >Delete</button>
      </div>

      {open && (
        <div className="border-t border-vigno-line/40 p-3 space-y-4">
          {/* Grant a course */}
          <div>
            <p className="text-[11px] font-bold text-vigno-muted uppercase tracking-wider mb-2">Grant a course</p>
            <div className="flex flex-wrap items-end gap-2">
              <select value={courseSlug} onChange={(e) => setCourseSlug(e.target.value)} className={input}>
                <option value="">Select course…</option>
                {(courses || []).map((c) => {
                  const slug = typeof c === 'string' ? c : (c?.slug || c?.courseKey || '')
                  const label = typeof c === 'string' ? c.replace(/_/g, ' ') : (c?.name || String(slug).replace(/_/g, ' '))
                  const clientOnly = typeof c === 'object' && c?.meta?.clientOnly
                  return <option key={slug} value={slug}>{label}{clientOnly ? ' — client-only' : ''}</option>
                })}
              </select>
              <div className="flex flex-col">
                <label className="text-[10px] text-vigno-muted mb-0.5">Valid until (blank = default)</label>
                <input type="date" min={tomorrow()} value={validity} onChange={(e) => setValidity(e.target.value)} className={input} />
              </div>
              <button disabled={!courseSlug || grant.isPending} onClick={() => { setMsg(null); grant.mutate() }} className={btn}>
                {grant.isPending ? 'Granting…' : 'Grant'}
              </button>
            </div>
            {msg && <p className={`text-xs mt-2 ${msg.ok ? 'text-green-400' : 'text-red-400'}`}>{msg.text}</p>}
          </div>

          {/* Current grants */}
          <div>
            <p className="text-[11px] font-bold text-vigno-muted uppercase tracking-wider mb-2">Granted courses</p>
            {grantsQ.isLoading && <p className="text-xs text-vigno-muted">Loading…</p>}
            {grantsQ.data?.length === 0 && <p className="text-xs text-vigno-muted">No courses granted yet.</p>}
            <div className="space-y-1.5">
              {grantsQ.data?.map((g) => (
                <div key={g.courseSlug} className="flex items-center justify-between gap-3 text-sm px-3 py-2 rounded-lg bg-vigno-bg2/50 border border-vigno-line/40">
                  <span className="text-vigno-txt">{g.courseName} <span className="text-vigno-muted text-xs">({g.lessons} lessons)</span></span>
                  <span className="flex items-center gap-3">
                    <span className={`text-xs ${g.expired ? 'text-red-400' : 'text-vigno-muted'}`}>{g.expired ? 'Expired' : 'Valid until'} {fmtDate(g.expiresAt)}</span>
                    <button onClick={() => revoke.mutate(g.courseSlug)} className="text-xs font-semibold text-red-400 hover:text-red-300">Revoke</button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ClientsPanel() {
  const qc = useQueryClient()
  const { data: courses } = useClasses()
  const clientsQ = useQuery({ queryKey: ['admin', 'clients'], queryFn: adminApi.listClients })

  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState(null)

  const create = useMutation({
    mutationFn: () => adminApi.createClient({ email: email.trim(), name: name.trim(), password }),
    onSuccess: () => {
      setMsg({ ok: true, text: `Client "${email.trim()}" created.` })
      setEmail(''); setName(''); setPassword('')
      qc.invalidateQueries({ queryKey: ['admin', 'clients'] })
    },
    onError: (e) => setMsg({ ok: false, text: apiErrorMessage(e, 'Could not create client') }),
  })

  return (
    <div className="space-y-6">
      <p className="text-sm text-vigno-muted">
        Clients are admin-provisioned accounts (no payment). They log in on the normal login page and see
        <b> only the courses you grant them</b>, each with a validity date. Grant expires → access ends.
      </p>

      {/* Create client */}
      <div className="rounded-2xl border border-vigno-line/50 bg-vigno-card/40 p-5">
        <h3 className="text-xs font-extrabold text-vigno-accent uppercase tracking-widest mb-4">Create a client login</h3>
        <div className="flex flex-wrap items-end gap-3">
          <input placeholder="Client email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input + ' min-w-[220px]'} />
          <input placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} className={input} />
          <input placeholder="Password (min 6)" type="text" value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
          <button disabled={!email.trim() || password.length < 6 || create.isPending} onClick={() => { setMsg(null); create.mutate() }} className={btn}>
            {create.isPending ? 'Creating…' : 'Create client'}
          </button>
        </div>
        {msg && <p className={`text-sm mt-3 ${msg.ok ? 'text-green-400' : 'text-red-400'}`}>{msg.text}</p>}
      </div>

      {/* Clients list */}
      <div>
        <h3 className="text-xs font-extrabold text-vigno-accent uppercase tracking-widest mb-3">Clients ({clientsQ.data?.length || 0})</h3>
        {clientsQ.isLoading && <p className="text-sm text-vigno-muted">Loading…</p>}
        {clientsQ.data?.length === 0 && <p className="text-sm text-vigno-muted">No clients yet — create one above.</p>}
        <div className="space-y-2">
          {clientsQ.data?.map((c) => (
            <ClientRow key={c.id} client={c} courses={courses} onDeleted={() => qc.invalidateQueries({ queryKey: ['admin', 'clients'] })} />
          ))}
        </div>
      </div>
    </div>
  )
}
