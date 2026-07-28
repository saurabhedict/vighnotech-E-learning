import { useState } from 'react'
import { useSelector } from 'react-redux'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../api/adminApi'
import { apiErrorMessage } from '../../api/authApi'
import Avatar from '../../components/Avatar'

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
}

function UserCard({ u, isSelf, onRole, onDelete, busy }) {
  const verified = u.emailVerified || u.phoneVerified
  return (
    <div className="flex items-center gap-4 bg-vigno-card border border-vigno-line rounded-2xl px-4 py-3">
      <div className="flex-none">
        <Avatar user={u} size={44} verified={verified} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold truncate">{u.name || '(no name)'}</span>
          {u.role === 'admin' && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-vigno-accent/25 text-vigno-accent2">ADMIN</span>
          )}
          {isSelf && <span className="text-[10px] text-vigno-muted">(you)</span>}
        </div>
        <div className="text-sm text-vigno-muted truncate flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-vigno-muted/75 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
          <span className="flex items-center gap-1.5">
            <span>{u.email}</span>
            {u.emailVerified ? (
              <span className="text-emerald-400 font-semibold inline-flex items-center" title="Verified">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </span>
            ) : !u.phoneVerified ? (
              <span className="text-amber-400/90 text-[10px] inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md select-none font-semibold">
                <svg className="w-2.5 h-2.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <span>unverified</span>
              </span>
            ) : null}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-vigno-muted mt-0.5">
          {u.phone ? (
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-vigno-muted/75 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.622c0-1.25.996-2.285 2.228-2.308 1.13-.021 2.285.733 2.502 1.84l.322 1.637c.21 1.066-.34 2.152-1.267 2.684L5.85 10.996a12.01 12.01 0 005.004 5.004l1.154-1.155a2.25 2.25 0 012.235-.55l1.637.322c1.107.217 1.861 1.373 1.84 2.502-.023 1.232-1.058 2.228-2.308 2.228A14.63 14.63 0 012.25 6.622z" />
              </svg>
              <span className="flex items-center gap-1.5">
                <span>{u.phone}</span>
                {u.phoneVerified ? (
                  <span className="text-emerald-400 font-semibold inline-flex items-center" title="Verified">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </span>
                ) : null}
              </span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-vigno-muted/60">
              <svg className="w-3.5 h-3.5 text-vigno-muted/40 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.622c0-1.25.996-2.285 2.228-2.308 1.13-.021 2.285.733 2.502 1.84l.322 1.637c.21 1.066-.34 2.152-1.267 2.684L5.85 10.996a12.01 12.01 0 005.004 5.004l1.154-1.155a2.25 2.25 0 012.235-.55l1.637.322c1.107.217 1.861 1.373 1.84 2.502-.023 1.232-1.058 2.228-2.308 2.228A14.63 14.63 0 012.25 6.622z" />
              </svg>
              <span>no number</span>
            </span>
          )}
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5 text-vigno-muted/75 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>{fmtDate(u.createdAt)}</span>
          </span>
        </div>
      </div>

      {!isSelf && (
        <div className="flex flex-col gap-1.5 flex-none">
          <button
            onClick={() => onRole(u)}
            disabled={busy}
            className="text-xs font-semibold rounded-lg border border-vigno-accent2/50 text-vigno-accent2 px-3 py-1.5 hover:bg-vigno-accent2/10 disabled:opacity-40 flex items-center justify-center gap-1.5"
          >
            {u.role === 'admin' ? (
              <>
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
                </svg>
                <span>Demote</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                <span>Make Admin</span>
              </>
            )}
          </button>
          <button
            onClick={() => onDelete(u)}
            disabled={busy}
            className="text-xs font-semibold rounded-lg border border-red-500/50 text-red-400 px-3 py-1.5 hover:bg-red-500/10 disabled:opacity-40 flex items-center justify-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Delete</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default function UsersPanel() {
  const qc = useQueryClient()
  const me = useSelector((s) => s.auth.user)
  const [q, setQ] = useState('')
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  const users = useQuery({ queryKey: ['admin', 'users', q], queryFn: () => adminApi.listUsers(q) })

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'users'] })

  const onRole = async (u) => {
    setMsg(null); setBusy(true)
    const role = u.role === 'admin' ? 'user' : 'admin'
    try {
      await adminApi.setUserRole(u._id, role)
      setMsg({ ok: true, text: `${u.email} is now ${role}` })
      refresh()
    } catch (e) { setMsg({ ok: false, text: apiErrorMessage(e, 'Could not change role') }) }
    finally { setBusy(false) }
  }

  const onDelete = async (u) => {
    if (!window.confirm(`Delete ${u.email}? This removes their account, licenses and purchases. This cannot be undone.`)) return
    setMsg(null); setBusy(true)
    try {
      await adminApi.deleteUser(u._id)
      setMsg({ ok: true, text: `Deleted ${u.email}` })
      refresh()
    } catch (e) { setMsg({ ok: false, text: apiErrorMessage(e, 'Could not delete user') }) }
    finally { setBusy(false) }
  }

  const input = 'px-3 py-2 rounded-lg bg-vigno-bg2 border border-vigno-line text-sm outline-none'
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <input placeholder="Search name, email or phone…" value={q} onChange={(e) => setQ(e.target.value)} className={input + ' flex-1'} />
        <span className="text-xs text-vigno-muted whitespace-nowrap">{users.data?.length ?? 0} users</span>
      </div>

      {msg && (
        <p className={'text-sm mb-3 ' + (msg.ok ? 'text-green-300' : 'text-red-300')}>{msg.text}</p>
      )}
      {users.isLoading && <p className="text-vigno-muted">Loading users…</p>}
      {users.isError && <p className="text-red-300">Failed to load users.</p>}
      {users.data?.length === 0 && <p className="text-vigno-muted py-4">No users match "{q}".</p>}

      <div className="flex flex-col gap-2.5">
        {users.data?.map((u) => (
          <UserCard key={u._id} u={u} isSelf={u._id === me?.id} onRole={onRole} onDelete={onDelete} busy={busy} />
        ))}
      </div>
    </div>
  )
}
