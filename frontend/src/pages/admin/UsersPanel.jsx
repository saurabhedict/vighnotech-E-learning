import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../api/adminApi'
import { apiErrorMessage } from '../../api/authApi'

export default function UsersPanel() {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [msg, setMsg] = useState(null)
  const users = useQuery({ queryKey: ['admin', 'users', q], queryFn: () => adminApi.listUsers(q) })

  const toggleRole = async (u) => {
    setMsg(null)
    const role = u.role === 'admin' ? 'user' : 'admin'
    try {
      await adminApi.setUserRole(u._id, role)
      setMsg({ ok: true, text: `${u.email} is now ${role}` })
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
    } catch (e) {
      setMsg({ ok: false, text: apiErrorMessage(e, 'Could not change role') })
    }
  }

  const input = 'px-3 py-2 rounded-lg bg-[#1c0e11] border border-vigno-line text-sm outline-none focus:border-vigno-accent'
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <input placeholder="Search email…" value={q} onChange={(e) => setQ(e.target.value)} className={input + ' flex-1'} />
      </div>
      {msg && <p className={'text-sm mb-2 ' + (msg.ok ? 'text-green-300' : 'text-red-300')}>{msg.text}</p>}
      {users.isLoading && <p className="text-vigno-muted">Loading users…</p>}
      <div className="max-h-[28rem] overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-black/20 text-vigno-muted text-xs sticky top-0">
            <tr>
              <th className="text-left px-3 py-2">Email</th>
              <th className="text-left px-3 py-2">Role</th>
              <th className="text-left px-3 py-2">Verified</th>
              <th className="text-left px-3 py-2">2FA</th>
              <th className="text-left px-3 py-2">Joined</th>
              <th className="text-right px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.data?.map((u) => (
              <tr key={u._id} className="border-t border-vigno-line/40">
                <td className="px-3 py-1.5">{u.email}<div className="text-xs text-vigno-muted">{u.name}</div></td>
                <td className="px-3 py-1.5">
                  <span className={'text-[10px] font-bold px-2 py-0.5 rounded-full ' + (u.role === 'admin' ? 'bg-vigno-accent/25 text-vigno-accent2' : 'bg-white/10 text-vigno-muted')}>
                    {u.role.toUpperCase()}
                  </span>
                </td>
                <td className="px-3 py-1.5">{u.emailVerified ? '✓' : '—'}</td>
                <td className="px-3 py-1.5">{u.twoFAEnabled ? '🔐' : '—'}</td>
                <td className="px-3 py-1.5 text-vigno-muted text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="px-3 py-1.5 text-right">
                  <button onClick={() => toggleRole(u)} className="text-xs bg-white/10 hover:bg-white/20 border border-vigno-line rounded-lg px-2.5 py-1">
                    {u.role === 'admin' ? 'Demote' : 'Make admin'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
