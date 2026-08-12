import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../api/adminApi'
import { apiErrorMessage } from '../../api/authApi'
import { useClasses } from '../../hooks/useContent'

const input = 'px-3 py-2 rounded-lg bg-vigno-bg2 border border-vigno-line/60 text-sm text-vigno-txt outline-none focus:border-vigno-accent/60 transition-colors'
const btn = 'px-4 py-2 rounded-lg bg-vigno-accent text-vigno-bg1 font-bold text-sm hover:brightness-110 disabled:opacity-60 transition-all active:scale-95'
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '—')
const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10) }

const TYPE_ICON = {
  pdf: '📄', video: '🎬', '3d': '🧊', game: '🎮', apk: '📱',
  image: '🖼️', audio: '🎵', quiz: '📝', link: '🔗',
}
const TYPE_LABEL = {
  pdf: 'PDF', video: 'Video', '3d': '3D Model', game: 'Simulator',
  apk: 'Android App', image: 'Image', audio: 'Audio', quiz: 'Quiz', link: 'Link',
}

// ── Client login credentials (view/change password) ────────────────────────────
// Password is stored reversibly for CLIENTS only. Revealing it requires the admin
// to re-enter their OWN password; changing it signs the client out of open sessions.
function ClientCredentials({ client }) {
  const qc = useQueryClient()
  const [mode, setMode] = useState(null) // null | 'reveal' | 'change'
  const [adminPwd, setAdminPwd] = useState('')
  const [revealed, setRevealed] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [msg, setMsg] = useState(null)

  const reset = () => { setMode(null); setAdminPwd(''); setRevealed(''); setNewPwd(''); setMsg(null) }

  const reveal = useMutation({
    mutationFn: () => adminApi.revealClientPassword(client.id, adminPwd),
    onSuccess: (pw) => { setRevealed(pw); setAdminPwd(''); setMode(null); setMsg(null) },
    onError: (e) => setMsg({ ok: false, text: apiErrorMessage(e, 'Could not reveal password') }),
  })

  const change = useMutation({
    mutationFn: () => adminApi.setClientPassword(client.id, newPwd),
    onSuccess: () => {
      setMsg({ ok: true, text: 'Password updated — the client was signed out of existing sessions.' })
      setNewPwd(''); setMode(null); setRevealed('')
      qc.invalidateQueries({ queryKey: ['admin', 'clients'] })
    },
    onError: (e) => setMsg({ ok: false, text: apiErrorMessage(e, 'Could not update password') }),
  })

  return (
    <div className="rounded-xl bg-vigno-bg2/40 border border-vigno-line/40 p-4 space-y-3">
      <p className="text-[11px] font-extrabold text-vigno-muted uppercase tracking-widest">Login credentials</p>
      <div className="flex flex-wrap items-center gap-2.5 text-sm">
        <span className="text-vigno-muted w-20">Email</span>
        <span className="font-mono text-vigno-txt">{client.email}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2.5 text-sm">
        <span className="text-vigno-muted w-20">Password</span>
        {revealed ? (
          <>
            <span className="font-mono text-vigno-txt bg-vigno-bg1/60 px-2 py-1 rounded select-all">{revealed}</span>
            <button onClick={() => navigator.clipboard?.writeText(revealed)} className="text-xs font-bold text-vigno-accent hover:underline">Copy</button>
            <button onClick={reset} className="text-xs font-bold text-vigno-muted hover:text-vigno-txt">Hide</button>
          </>
        ) : (
          <>
            <span className="font-mono text-vigno-txt tracking-[0.2em]">••••••••</span>
            {client.hasStoredPassword ? (
              <button onClick={() => { setMode(mode === 'reveal' ? null : 'reveal'); setMsg(null) }} className="text-xs font-bold text-vigno-accent hover:underline">
                {mode === 'reveal' ? 'Cancel' : 'Reveal'}
              </button>
            ) : (
              <span className="text-xs text-vigno-muted italic">not viewable yet — set a new password to enable</span>
            )}
          </>
        )}
        <span className="text-vigno-line/60">·</span>
        <button onClick={() => { setMode(mode === 'change' ? null : 'change'); setMsg(null) }} className="text-xs font-bold text-vigno-muted hover:text-vigno-accent">
          {mode === 'change' ? 'Cancel' : 'Change password'}
        </button>
      </div>

      {/* Reveal — admin re-authenticates with their own password */}
      {mode === 'reveal' && !revealed && (
        <div className="flex flex-wrap items-end gap-2">
          <input type="password" autoComplete="new-password" placeholder="Your admin password" value={adminPwd} onChange={(e) => setAdminPwd(e.target.value)} className={input} />
          <button disabled={!adminPwd || reveal.isPending} onClick={() => reveal.mutate()} className={btn}>{reveal.isPending ? 'Verifying…' : 'Verify & show'}</button>
        </div>
      )}

      {/* Change password */}
      {mode === 'change' && (
        <div className="flex flex-wrap items-end gap-2">
          <input type="text" placeholder="New password (min 6)" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} className={input} />
          <button disabled={newPwd.length < 6 || change.isPending} onClick={() => change.mutate()} className={btn}>{change.isPending ? 'Updating…' : 'Update password'}</button>
        </div>
      )}

      {msg && <p className={`text-xs ${msg.ok ? 'text-green-400' : 'text-red-400'}`}>{msg.text}</p>}
    </div>
  )
}

// ── Client row ────────────────────────────────────────────────────────────────
function ClientRow({ client, courses, resources, onDeleted }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('courses') // 'courses' | 'resources'

  // Course grant state
  const [courseSlugs, setCourseSlugs] = useState([])
  const [courseMenuOpen, setCourseMenuOpen] = useState(false)
  const [courseValidity, setCourseValidity] = useState('')
  const [courseMsg, setCourseMsg] = useState(null)

  // Resource grant state
  const [resourceIds, setResourceIds] = useState([])
  const [resourceMenuOpen, setResourceMenuOpen] = useState(false)
  const [resourceValidity, setResourceValidity] = useState('')
  const [resourceMsg, setResourceMsg] = useState(null)

  const grantsQ = useQuery({
    queryKey: ['admin', 'client', client.id, 'grants'],
    queryFn: () => adminApi.listClientGrants(client.id),
    enabled: open,
  })

  const courseGrants = grantsQ.data?.items || []
  const resourceGrants = grantsQ.data?.resourceGrants || []

  const grantCourse = useMutation({
    mutationFn: () => Promise.all(courseSlugs.map((courseSlug) => adminApi.grantCourse(client.id, {
      courseSlug,
      expiresAt: courseValidity ? `${courseValidity}T23:59:59` : undefined,
    }))),
    onSuccess: (results) => {
      const count = results.length
      const expiry = results[0]?.expiresAt ? ' until ' + fmtDate(results[0].expiresAt) : ' (no expiry)'
      setCourseMsg({ ok: true, text: `Granted ${count} course${count === 1 ? '' : 's'}${expiry}` })
      setCourseSlugs([]); setCourseValidity(''); setCourseMenuOpen(false)
      qc.invalidateQueries({ queryKey: ['admin', 'client', client.id, 'grants'] })
      qc.invalidateQueries({ queryKey: ['admin', 'clients'] })
    },
    onError: (e) => setCourseMsg({ ok: false, text: apiErrorMessage(e, 'Grant failed') }),
  })

  const revokeCourse = useMutation({
    mutationFn: (slug) => adminApi.revokeGrant(client.id, slug),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'client', client.id, 'grants'] })
      qc.invalidateQueries({ queryKey: ['admin', 'clients'] })
    },
  })

  const grantResource = useMutation({
    mutationFn: () => Promise.all(resourceIds.map((contentId) => adminApi.grantResource(client.id, {
      contentId,
      expiresAt: resourceValidity ? `${resourceValidity}T23:59:59` : undefined,
    }))),
    onSuccess: (results) => {
      const count = results.length
      const expiry = results[0]?.expiresAt ? ' until ' + fmtDate(results[0].expiresAt) : ' (no expiry)'
      setResourceMsg({ ok: true, text: `Granted ${count} resource${count === 1 ? '' : 's'}${expiry}` })
      setResourceIds([]); setResourceValidity(''); setResourceMenuOpen(false)
      qc.invalidateQueries({ queryKey: ['admin', 'client', client.id, 'grants'] })
      qc.invalidateQueries({ queryKey: ['admin', 'clients'] })
    },
    onError: (e) => setResourceMsg({ ok: false, text: apiErrorMessage(e, 'Grant failed') }),
  })

  const revokeResource = useMutation({
    mutationFn: (contentId) => adminApi.revokeResource(client.id, contentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'client', client.id, 'grants'] })
      qc.invalidateQueries({ queryKey: ['admin', 'clients'] })
    },
  })

  const toggleResource = (id) => {
    setResourceIds((current) => current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id])
  }

  const toggleCourse = (slug) => {
    setCourseSlugs((current) => current.includes(slug) ? current.filter((selectedSlug) => selectedSlug !== slug) : [...current, slug])
  }

  const totalGrants = courseGrants.length + resourceGrants.length

  return (
    <div className={`rounded-2xl border transition-all duration-200 ${open ? 'border-vigno-accent/40 bg-vigno-card/70 shadow-lg shadow-vigno-accent/5' : 'border-vigno-line/50 bg-vigno-card/40 hover:border-vigno-line/80'}`}>
      {/* Row header */}
      <div className="flex items-center justify-between gap-3 p-4">
        <button onClick={() => setOpen((v) => !v)} className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-8 h-8 rounded-full bg-vigno-accent/15 flex items-center justify-center text-vigno-accent font-extrabold text-sm shrink-0">
              {(client.name || client.email || '?')[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <span className="font-bold text-sm text-vigno-txt">{client.name || '(no name)'}</span>
              <span className="text-vigno-muted font-normal text-sm"> · {client.email}</span>
            </div>
          </div>
          <div className="text-xs text-vigno-muted mt-1 ml-10">
            {client.activeLicenses} active grant{client.activeLicenses === 1 ? '' : 's'} · added {fmtDate(client.createdAt)}
          </div>
        </button>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setOpen((v) => !v)}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${open ? 'bg-vigno-accent/15 text-vigno-accent' : 'bg-vigno-bg2 text-vigno-muted hover:text-vigno-accent hover:bg-vigno-accent/10'}`}
          >
            {open ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" /></svg>
                Close
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                Manage
              </>
            )}
          </button>
          <button
            onClick={() => { if (window.confirm(`Delete client ${client.email} and all their grants?`)) adminApi.deleteClient(client.id).then(onDeleted) }}
            className="flex items-center gap-1.5 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-400/10 px-3 py-1.5 rounded-lg transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
            Delete
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-vigno-line/40 p-4 space-y-5">
          {/* Login credentials (view/change password) */}
          <ClientCredentials client={client} />

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-vigno-bg2/60 rounded-xl p-1 w-fit">
            <button
              onClick={() => setTab('courses')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'courses' ? 'bg-vigno-accent text-vigno-bg1 shadow' : 'text-vigno-muted hover:text-vigno-txt'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>
              Courses
              {courseGrants.length > 0 && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${tab === 'courses' ? 'bg-vigno-bg1/20' : 'bg-vigno-accent/15 text-vigno-accent'}`}>{courseGrants.length}</span>
              )}
            </button>
            <button
              onClick={() => setTab('resources')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'resources' ? 'bg-vigno-accent text-vigno-bg1 shadow' : 'text-vigno-muted hover:text-vigno-txt'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
              Individual Resources
              {resourceGrants.length > 0 && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${tab === 'resources' ? 'bg-vigno-bg1/20' : 'bg-vigno-accent/15 text-vigno-accent'}`}>{resourceGrants.length}</span>
              )}
            </button>
          </div>

          {grantsQ.isLoading && (
            <div className="flex items-center gap-2 text-xs text-vigno-muted">
              <div className="w-3 h-3 border-2 border-vigno-accent/40 border-t-vigno-accent rounded-full animate-spin" />
              Loading grants…
            </div>
          )}

          {/* ── COURSES TAB ── */}
          {tab === 'courses' && !grantsQ.isLoading && (
            <div className="space-y-5">
              {/* Grant a course */}
              <div className="rounded-xl bg-vigno-bg2/40 border border-vigno-line/40 p-4 space-y-3">
                <p className="text-[11px] font-extrabold text-vigno-muted uppercase tracking-widest">Grant a course</p>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="relative min-w-[260px] flex-1">
                    <button
                      type="button"
                      onClick={() => setCourseMenuOpen((open) => !open)}
                      aria-haspopup="listbox"
                      aria-expanded={courseMenuOpen}
                      className={input + ' flex min-h-[42px] w-full items-center justify-between gap-3 text-left'}
                    >
                      <span className={courseSlugs.length ? 'text-vigno-txt' : 'text-vigno-muted'}>
                        {courseSlugs.length ? `${courseSlugs.length} course${courseSlugs.length === 1 ? '' : 's'} selected` : 'Select courses…'}
                      </span>
                      <svg className={`h-4 w-4 shrink-0 transition-transform ${courseMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" /></svg>
                    </button>
                    {courseMenuOpen && (
                      <div role="listbox" aria-multiselectable="true" className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-lg border border-vigno-line bg-vigno-bg2 p-1 shadow-xl">
                        {(courses || []).length === 0 ? (
                          <p className="px-3 py-2 text-xs text-vigno-muted">No courses available.</p>
                        ) : (courses || []).map((c) => {
                          const slug = typeof c === 'string' ? c : (c?.slug || c?.courseKey || '')
                          const label = typeof c === 'string' ? c.replace(/_/g, ' ') : (c?.name || String(slug).replace(/_/g, ' '))
                          const clientOnly = typeof c === 'object' && c?.meta?.clientOnly
                          const checked = courseSlugs.includes(slug)
                          return (
                            <label key={slug} role="option" aria-selected={checked} className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-vigno-txt hover:bg-vigno-accent/10">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleCourse(slug)}
                                className="h-4 w-4 shrink-0 rounded-sm accent-vigno-accent"
                              />
                              <span className="min-w-0 truncate">{label}{clientOnly ? <span className="text-xs text-vigno-muted"> — client-only</span> : null}</span>
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-vigno-muted font-semibold">Valid until (blank = default)</label>
                    <input type="date" min={tomorrow()} value={courseValidity} onChange={(e) => setCourseValidity(e.target.value)} className={input} />
                  </div>
                  <button
                    disabled={courseSlugs.length === 0 || grantCourse.isPending}
                    onClick={() => { setCourseMsg(null); grantCourse.mutate() }}
                    className={btn}
                  >
                    {grantCourse.isPending ? 'Granting…' : 'Grant Course'}
                  </button>
                </div>
                {courseMsg && <p className={`text-xs ${courseMsg.ok ? 'text-green-400' : 'text-red-400'}`}>{courseMsg.text}</p>}
              </div>

              {/* Granted courses list */}
              <div>
                <p className="text-[11px] font-extrabold text-vigno-muted uppercase tracking-widest mb-3">Granted courses</p>
                {courseGrants.length === 0 && <p className="text-xs text-vigno-muted italic">No courses granted yet.</p>}
                <div className="space-y-2">
                  {courseGrants.map((g) => (
                    <div key={g.courseSlug} className="flex items-center justify-between gap-3 text-sm px-4 py-3 rounded-xl bg-vigno-bg2/60 border border-vigno-line/40">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-vigno-accent/10 flex items-center justify-center text-vigno-accent shrink-0">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-vigno-txt truncate">{g.courseName}</p>
                          <p className="text-xs text-vigno-muted">{g.lessons} lesson{g.lessons === 1 ? '' : 's'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${g.expired ? 'bg-red-500/15 text-red-400' : 'bg-green-500/15 text-green-400'}`}>
                          {g.expired ? '✕ Expired' : `✓ Until ${fmtDate(g.expiresAt)}`}
                        </span>
                        <button
                          type="button"
                          title={`Remove ${g.courseName} from this client`}
                          disabled={revokeCourse.isPending}
                          onClick={() => {
                            if (window.confirm(`Remove "${g.courseName}" from this client?`)) revokeCourse.mutate(g.courseSlug)
                          }}
                          className="flex items-center gap-1 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-400/10 disabled:opacity-60 px-2.5 py-1 rounded-lg transition-all"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12m-9 0V5.5A1.5 1.5 0 0110.5 4h3A1.5 1.5 0 0115 5.5V7m-7 0 .75 12.25A1.75 1.75 0 0010.5 21h3a1.75 1.75 0 001.75-1.75L16 7M10 11v6m4-6v6" /></svg>
                          Delete course
                        </button>
                        <button
                          type="button"
                          title={`Revoke ${g.courseName} from this client`}
                          disabled={revokeCourse.isPending}
                          onClick={() => {
                            if (window.confirm(`Revoke "${g.courseName}" from this client?`)) revokeCourse.mutate(g.courseSlug)
                          }}
                          className="text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-400/10 disabled:opacity-60 px-2.5 py-1 rounded-lg transition-all"
                        >
                          Revoke
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── RESOURCES TAB ── */}
          {tab === 'resources' && !grantsQ.isLoading && (
            <div className="space-y-5">
              {/* Grant a resource */}
              <div className="rounded-xl bg-vigno-bg2/40 border border-vigno-line/40 p-4 space-y-3">
                <p className="text-[11px] font-extrabold text-vigno-muted uppercase tracking-widest">Grant an individual resource</p>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="relative min-w-[260px] flex-1">
                    <button
                      type="button"
                      onClick={() => setResourceMenuOpen((open) => !open)}
                      aria-haspopup="listbox"
                      aria-expanded={resourceMenuOpen}
                      className={input + ' flex min-h-[42px] w-full items-center justify-between gap-3 text-left'}
                    >
                      <span className={resourceIds.length ? 'text-vigno-txt' : 'text-vigno-muted'}>
                        {resourceIds.length ? `${resourceIds.length} resource${resourceIds.length === 1 ? '' : 's'} selected` : 'Select resources…'}
                      </span>
                      <svg className={`h-4 w-4 shrink-0 transition-transform ${resourceMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" /></svg>
                    </button>
                    {resourceMenuOpen && (
                      <div role="listbox" aria-multiselectable="true" className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-lg border border-vigno-line bg-vigno-bg2 p-1 shadow-xl">
                        {(resources || []).length === 0 ? (
                          <p className="px-3 py-2 text-xs text-vigno-muted">No individual resources available.</p>
                        ) : (resources || []).map((r) => {
                          const id = String(r._id)
                          const checked = resourceIds.includes(id)
                          return (
                            <label key={id} role="option" aria-selected={checked} className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-vigno-txt hover:bg-vigno-accent/10">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleResource(id)}
                                className="h-4 w-4 shrink-0 rounded-sm accent-vigno-accent"
                              />
                              <span className="min-w-0 truncate">{TYPE_ICON[r.type] || '📦'} {r.title} <span className="text-xs text-vigno-muted">— {TYPE_LABEL[r.type] || r.type}</span></span>
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-vigno-muted font-semibold">Valid until (blank = default)</label>
                    <input type="date" min={tomorrow()} value={resourceValidity} onChange={(e) => setResourceValidity(e.target.value)} className={input} />
                  </div>
                  <button
                    disabled={resourceIds.length === 0 || grantResource.isPending}
                    onClick={() => { setResourceMsg(null); grantResource.mutate() }}
                    className={btn}
                  >
                    {grantResource.isPending ? 'Granting…' : 'Grant Resource'}
                  </button>
                </div>
                {resourceMsg && <p className={`text-xs ${resourceMsg.ok ? 'text-green-400' : 'text-red-400'}`}>{resourceMsg.text}</p>}
              </div>

              {/* Granted resources list */}
              <div>
                <p className="text-[11px] font-extrabold text-vigno-muted uppercase tracking-widest mb-3">Granted resources</p>
                {resourceGrants.length === 0 && <p className="text-xs text-vigno-muted italic">No individual resources granted yet.</p>}
                <div className="space-y-2">
                  {resourceGrants.map((g) => (
                    <div key={g.contentId?.toString() || g.licenseId} className="flex items-center justify-between gap-3 text-sm px-4 py-3 rounded-xl bg-vigno-bg2/60 border border-vigno-line/40">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-vigno-accent/10 flex items-center justify-center text-base shrink-0">
                          {TYPE_ICON[g.type] || '📦'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-vigno-txt truncate">{g.title}</p>
                          <p className="text-xs text-vigno-muted">{TYPE_LABEL[g.type] || g.type || 'Resource'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${g.expired ? 'bg-red-500/15 text-red-400' : 'bg-green-500/15 text-green-400'}`}>
                          {g.expired ? '✕ Expired' : `✓ Until ${fmtDate(g.expiresAt)}`}
                        </span>
                        <button
                          type="button"
                          title={`Remove ${g.title} from this client`}
                          disabled={revokeResource.isPending}
                          onClick={() => {
                            if (window.confirm(`Remove "${g.title}" from this client?`)) revokeResource.mutate(g.contentId?.toString())
                          }}
                          className="flex items-center gap-1 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-400/10 disabled:opacity-60 px-2.5 py-1 rounded-lg transition-all"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12m-9 0V5.5A1.5 1.5 0 0110.5 4h3A1.5 1.5 0 0115 5.5V7m-7 0 .75 12.25A1.75 1.75 0 0010.5 21h3a1.75 1.75 0 001.75-1.75L16 7M10 11v6m4-6v6" /></svg>
                          Delete resource
                        </button>
                        <button
                          type="button"
                          title={`Revoke ${g.title} from this client`}
                          disabled={revokeResource.isPending}
                          onClick={() => {
                            if (window.confirm(`Revoke "${g.title}" from this client?`)) revokeResource.mutate(g.contentId?.toString())
                          }}
                          className="text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-400/10 disabled:opacity-60 px-2.5 py-1 rounded-lg transition-all"
                        >
                          Revoke
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────
export default function ClientsPanel() {
  const qc = useQueryClient()
  const { data: courses } = useClasses()
  const { data: resources } = useQuery({
    queryKey: ['admin', 'resources'],
    queryFn: () => adminApi.listResources(),
  })
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
      <p className="text-sm text-vigno-muted leading-relaxed">
        Clients are admin-provisioned accounts (no payment). They log in on the normal login page and see
        <b className="text-vigno-txt"> only the courses and resources you grant them</b>, each with a validity date.
        Grant expires → access ends. If a resource or course is deleted, its grant is automatically removed.
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
        <h3 className="text-xs font-extrabold text-vigno-accent uppercase tracking-widest mb-3">
          Clients ({clientsQ.data?.length || 0})
        </h3>
        {clientsQ.isLoading && <p className="text-sm text-vigno-muted">Loading…</p>}
        {clientsQ.data?.length === 0 && <p className="text-sm text-vigno-muted">No clients yet — create one above.</p>}
        <div className="space-y-2">
          {clientsQ.data?.map((c) => (
            <ClientRow
              key={c.id}
              client={c}
              courses={courses}
              resources={resources}
              onDeleted={() => qc.invalidateQueries({ queryKey: ['admin', 'clients'] })}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
