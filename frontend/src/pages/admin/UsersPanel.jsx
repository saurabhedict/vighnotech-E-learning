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
        <div className="text-sm text-vigno-muted truncate">
          ✉ {u.email}{' '}
          {u.emailVerified
            ? <span className="text-green-300 text-xs font-semibold">✓</span>
            : <span className="text-amber-300/80 text-xs">○ unverified</span>}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-vigno-muted mt-0.5">
          {u.phone
            ? <span>📞 {u.phone}{' '}
                {u.phoneVerified
                  ? <span className="text-green-300 font-semibold">✓ verified</span>
                  : <span className="text-amber-300/80">○ unverified</span>}
              </span>
            : <span className="text-vigno-muted/60">📞 no number</span>}
          {u.twoFAEnabled && <span>🔐 2FA</span>}
          <span>📅 {fmtDate(u.createdAt)}</span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 flex-none">
        <button
          onClick={() => onRole(u)}
          disabled={busy || isSelf}
          className="text-xs font-semibold rounded-lg border border-vigno-accent2/50 text-vigno-accent2 px-3 py-1.5 hover:bg-vigno-accent2/10 disabled:opacity-40"
        >
          {u.role === 'admin' ? '⬇ Demote' : '🛡 Make Admin'}
        </button>
        <button
          onClick={() => onDelete(u)}
          disabled={busy || isSelf}
          className="text-xs font-semibold rounded-lg border border-red-500/50 text-red-300 px-3 py-1.5 hover:bg-red-500/10 disabled:opacity-40"
        >
          🗑 Delete
        </button>
      </div>
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

  const input = 'px-3 py-2 rounded-lg bg-vigno-bg2 border border-vigno-line text-sm outline-none focus:border-vigno-accent'
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
