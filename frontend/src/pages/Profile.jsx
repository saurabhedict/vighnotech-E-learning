import { useState } from 'react'
import { useSelector } from 'react-redux'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { authApi, apiErrorMessage } from '../api/authApi'
import { devicesApi } from '../api/devicesApi'
import { getDeviceFingerprint, deviceLabel } from '../lib/fingerprint'

function Card({ title, children }) {
  return (
    <section className="max-w-2xl bg-vigno-card border border-vigno-line rounded-2xl p-5 mb-6">
      <h2 className="text-base font-bold mb-3 pl-2.5 border-l-4 border-vigno-accent">{title}</h2>
      {children}
    </section>
  )
}

function ChangePassword() {
  const [cur, setCur] = useState('')
  const [next, setNext] = useState('')
  const [msg, setMsg] = useState(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setMsg(null)
    setLoading(true)
    try {
      await authApi.changePassword(cur, next)
      setMsg({ ok: true, text: 'Password changed. Other sessions were signed out.' })
      setCur(''); setNext('')
    } catch (err) {
      setMsg({ ok: false, text: apiErrorMessage(err, 'Could not change password') })
    } finally {
      setLoading(false)
    }
  }

  const input = 'w-full mb-3 px-3 py-2.5 rounded-lg bg-[#1c0e11] border border-vigno-line text-sm outline-none focus:border-vigno-accent'
  return (
    <form onSubmit={submit}>
      {msg && (
        <div className={'mb-3 text-sm rounded-lg px-3 py-2 border ' +
          (msg.ok ? 'bg-green-500/15 border-green-500/40 text-green-200' : 'bg-red-500/15 border-red-500/40 text-red-200')}>
          {msg.text}
        </div>
      )}
      <label className="text-xs text-vigno-muted block mb-1.5">Current password</label>
      <input type="password" value={cur} onChange={(e) => setCur(e.target.value)} className={input} />
      <label className="text-xs text-vigno-muted block mb-1.5">New password (min 8)</label>
      <input type="password" value={next} onChange={(e) => setNext(e.target.value)} className={input} />
      <button disabled={loading} className="bg-vigno-accent text-[#1a0d0f] font-bold px-4 py-2 rounded-lg hover:brightness-110 disabled:opacity-60">
        {loading ? 'Saving…' : 'Change Password'}
      </button>
    </form>
  )
}

function Devices() {
  const queryClient = useQueryClient()
  const devices = useQuery({ queryKey: ['devices', 'mine'], queryFn: devicesApi.mine })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const register = async () => {
    setErr('')
    setBusy(true)
    try {
      const fp = await getDeviceFingerprint()
      await devicesApi.register(fp, deviceLabel())
      queryClient.invalidateQueries({ queryKey: ['devices', 'mine'] })
    } catch (e) {
      setErr(apiErrorMessage(e, 'Could not register device'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <p className="text-xs text-vigno-muted mb-3">
        Downloadable software is bound to a registered device (console-style "home device"). A copied
        encrypted file won't unlock elsewhere.
      </p>
      {err && <p className="text-sm text-red-300 mb-2">{err}</p>}
      <button onClick={register} disabled={busy}
        className="bg-white/10 hover:bg-white/20 border border-vigno-line rounded-lg px-3 py-2 text-sm mb-4 disabled:opacity-60">
        {busy ? 'Registering…' : '+ Register this device'}
      </button>

      {devices.isLoading && <p className="text-vigno-muted text-sm">Loading devices…</p>}
      {devices.data?.length === 0 && <p className="text-vigno-muted text-sm">No devices registered.</p>}
      <ul className="flex flex-col gap-2">
        {devices.data?.map((d) => (
          <li key={d.id} className="flex items-center justify-between bg-black/20 rounded-lg px-3 py-2 text-sm">
            <span>💻 {d.name || 'Device'}</span>
            <span className="text-xs text-vigno-muted">last seen {new Date(d.lastSeenAt).toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function Profile() {
  const user = useSelector((s) => s.auth.user)
  return (
    <div>
      <div className="text-sm text-vigno-muted mb-1">AeroLearn › Profile</div>
      <h1 className="text-2xl mb-5">👤 Profile</h1>

      <Card title="Account">
        <div className="grid grid-cols-[120px_1fr] gap-y-2 text-sm">
          <span className="text-vigno-muted">Name</span><span>{user?.name || '—'}</span>
          <span className="text-vigno-muted">Email</span><span>{user?.email}</span>
          <span className="text-vigno-muted">Role</span><span className="capitalize">{user?.role}</span>
        </div>
      </Card>

      <Card title="Change Password"><ChangePassword /></Card>
      <Card title="My Devices"><Devices /></Card>
    </div>
  )
}
