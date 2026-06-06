import { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { setUser } from '../store/authSlice'
import { authApi, apiErrorMessage } from '../api/authApi'
import { devicesApi } from '../api/devicesApi'
import { getDeviceFingerprint, deviceLabel } from '../lib/device'
import VerifyContact from '../components/VerifyContact'

function Card({ title, children }) {
  return (
    <section className="max-w-2xl bg-vigno-card border border-vigno-line rounded-2xl p-5 mb-6">
      <h2 className="text-base font-bold mb-3 pl-2.5 border-l-4 border-vigno-accent">{title}</h2>
      {children}
    </section>
  )
}

const input = 'w-full mb-3 px-3 py-2.5 rounded-lg bg-[#1c0e11] border border-vigno-line text-sm outline-none focus:border-vigno-accent'
const btn = 'bg-vigno-accent text-[#1a0d0f] font-bold px-4 py-2 rounded-lg hover:brightness-110 disabled:opacity-60'
const btnGhost = 'bg-white/10 hover:bg-white/20 border border-vigno-line rounded-lg px-3 py-2 text-sm disabled:opacity-60'

function Msg({ msg }) {
  if (!msg) return null
  return (
    <div className={'mb-3 text-sm rounded-lg px-3 py-2 border ' +
      (msg.ok ? 'bg-green-500/15 border-green-500/40 text-green-200' : 'bg-red-500/15 border-red-500/40 text-red-200')}>
      {msg.text}
    </div>
  )
}

function BackupCodes({ codes }) {
  if (!codes?.length) return null
  return (
    <div className="mt-3 bg-black/30 border border-vigno-line rounded-lg p-3">
      <p className="text-xs text-vigno-accent2 font-bold mb-2">⚠ Save these backup codes — each works once, shown only now.</p>
      <div className="grid grid-cols-2 gap-1.5 font-mono text-sm">
        {codes.map((c) => <span key={c}>{c}</span>)}
      </div>
    </div>
  )
}

function ChangePassword() {
  const [cur, setCur] = useState('')
  const [next, setNext] = useState('')
  const [msg, setMsg] = useState(null)
  const [loading, setLoading] = useState(false)
  const submit = async (e) => {
    e.preventDefault(); setMsg(null); setLoading(true)
    try {
      await authApi.changePassword(cur, next)
      setMsg({ ok: true, text: 'Password changed. Other sessions were signed out.' })
      setCur(''); setNext('')
    } catch (err) { setMsg({ ok: false, text: apiErrorMessage(err, 'Could not change password') }) }
    finally { setLoading(false) }
  }
  return (
    <form onSubmit={submit}>
      <Msg msg={msg} />
      <label className="text-xs text-vigno-muted block mb-1.5">Current password</label>
      <input type="password" value={cur} onChange={(e) => setCur(e.target.value)} className={input} />
      <label className="text-xs text-vigno-muted block mb-1.5">New password (min 8)</label>
      <input type="password" value={next} onChange={(e) => setNext(e.target.value)} className={input} />
      <button disabled={loading} className={btn}>{loading ? 'Saving…' : 'Change Password'}</button>
    </form>
  )
}

function EmailVerification() {
  const user = useSelector((s) => s.auth.user)
  if (user?.emailVerified || user?.phoneVerified) {
    return (
      <p className="text-sm text-green-300">
        ✓ Your account is verified{user.phoneVerified && !user.emailVerified ? ' (via phone)' : ''}.
      </p>
    )
  }
  return (
    <div>
      <p className="text-sm text-vigno-muted mb-3">
        Your account isn't verified yet. Choose a channel to receive a one-time code.
      </p>
      <VerifyContact defaultPhone={user?.phone || ''} />
    </div>
  )
}

function TwoFactor() {
  const dispatch = useDispatch()
  const user = useSelector((s) => s.auth.user)
  const [setup, setSetup] = useState(null) // { qr, secret }
  const [code, setCode] = useState('')
  const [pwd, setPwd] = useState('')
  const [backup, setBackup] = useState(null)
  const [msg, setMsg] = useState(null)
  const [loading, setLoading] = useState(false)

  const refreshUser = async () => {
    try { dispatch(setUser(await authApi.me())) }
    catch { setMsg({ ok: false, text: 'Saved, but could not refresh status — reload to see the latest.' }) }
  }

  const regenerate = async (e) => {
    e.preventDefault(); setMsg(null); setLoading(true)
    try {
      const r = await authApi.twoFA.regenerateBackupCodes(pwd); setPwd('')
      setBackup(r.backupCodes)
      setMsg({ ok: true, text: 'New backup codes generated — save them.' })
    } catch (err) { setMsg({ ok: false, text: apiErrorMessage(err, 'Could not regenerate') }) }
    finally { setLoading(false) }
  }

  const startTotp = async () => {
    setMsg(null); setLoading(true)
    try { setSetup(await authApi.twoFA.setupTotp()) }
    catch (err) { setMsg({ ok: false, text: apiErrorMessage(err) }) }
    finally { setLoading(false) }
  }
  const enableTotp = async (e) => {
    e.preventDefault(); setMsg(null); setLoading(true)
    try {
      const r = await authApi.twoFA.enableTotp(code.trim())
      setBackup(r.backupCodes); setSetup(null); setCode('')
      await refreshUser()
      setMsg({ ok: true, text: 'Authenticator 2FA enabled.' })
    } catch (err) { setMsg({ ok: false, text: apiErrorMessage(err, 'Could not enable') }) }
    finally { setLoading(false) }
  }
  const enableEmail = async () => {
    setMsg(null); setLoading(true)
    try {
      const r = await authApi.twoFA.enableEmail()
      setBackup(r.backupCodes); await refreshUser()
      setMsg({ ok: true, text: 'Email 2FA enabled.' })
    } catch (err) { setMsg({ ok: false, text: apiErrorMessage(err, 'Could not enable email 2FA') }) }
    finally { setLoading(false) }
  }
  const disable = async (e) => {
    e.preventDefault(); setMsg(null); setLoading(true)
    try {
      await authApi.twoFA.disable(pwd); setPwd(''); setBackup(null); await refreshUser()
      setMsg({ ok: true, text: '2FA disabled.' })
    } catch (err) { setMsg({ ok: false, text: apiErrorMessage(err, 'Could not disable') }) }
    finally { setLoading(false) }
  }

  if (user?.twoFAEnabled) {
    return (
      <div>
        <Msg msg={msg} />
        <p className="text-sm text-green-300 mb-3">✓ Two-factor is ON ({user.twoFAMethod === 'totp' ? 'authenticator app' : 'email codes'}).</p>
        <div className="flex gap-2 items-start flex-wrap">
          <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="Confirm password" className={input + ' max-w-[220px]'} />
          <button disabled={loading || !pwd} onClick={disable} className={btnGhost}>{loading ? '…' : 'Disable 2FA'}</button>
          <button disabled={loading || !pwd} onClick={regenerate} className={btnGhost}>{loading ? '…' : 'Regenerate backup codes'}</button>
        </div>
        <BackupCodes codes={backup} />
      </div>
    )
  }

  return (
    <div>
      <Msg msg={msg} />
      <p className="text-sm text-vigno-muted mb-3">Add a second step at sign-in. Recommended: an authenticator app (Google Authenticator / Authy).</p>

      {!setup ? (
        <div className="flex flex-wrap gap-2">
          <button onClick={startTotp} disabled={loading} className={btn}>{loading ? '…' : 'Set up authenticator app'}</button>
          <button onClick={enableEmail} disabled={loading || !user?.emailVerified} className={btnGhost}
            title={user?.emailVerified ? '' : 'Verify your email first'}>Use email codes</button>
        </div>
      ) : (
        <form onSubmit={enableTotp}>
          <p className="text-sm mb-2">1. Scan this QR in your authenticator app:</p>
          <img src={setup.qr} alt="2FA QR" className="bg-white p-2 rounded-lg w-44 h-44 mb-2" />
          <p className="text-xs text-vigno-muted mb-3">Or enter this key manually: <span className="font-mono">{setup.secret}</span></p>
          <p className="text-sm mb-2">2. Enter the 6-digit code it shows:</p>
          <div className="flex gap-2 items-start">
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" className={input + ' max-w-[160px] tracking-widest'} />
            <button disabled={loading} className={btn}>{loading ? 'Enabling…' : 'Enable'}</button>
            <button type="button" onClick={() => setSetup(null)} className={btnGhost}>Cancel</button>
          </div>
        </form>
      )}
      <BackupCodes codes={backup} />
    </div>
  )
}

function Devices() {
  const queryClient = useQueryClient()
  const devices = useQuery({ queryKey: ['devices', 'mine'], queryFn: devicesApi.mine })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const register = async () => {
    setErr(''); setBusy(true)
    try {
      const fp = await getDeviceFingerprint()
      await devicesApi.register(fp, deviceLabel())
      queryClient.invalidateQueries({ queryKey: ['devices', 'mine'] })
    } catch (e) { setErr(apiErrorMessage(e, 'Could not register device')) }
    finally { setBusy(false) }
  }
  return (
    <div>
      <p className="text-xs text-vigno-muted mb-3">
        Downloadable software is bound to a registered device (console-style "home device"). A copied
        encrypted file won't unlock elsewhere.
      </p>
      {err && <p className="text-sm text-red-300 mb-2">{err}</p>}
      <button onClick={register} disabled={busy} className={btnGhost + ' mb-4'}>{busy ? 'Registering…' : '+ Register this device'}</button>
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
        <div className="grid grid-cols-[140px_1fr] gap-y-2 text-sm">
          <span className="text-vigno-muted">Name</span><span>{user?.name || '—'}</span>
          <span className="text-vigno-muted">Email</span>
          <span>{user?.email} {user?.emailVerified ? <span className="text-green-300 text-xs">(verified)</span> : <span className="text-vigno-accent2 text-xs">(unverified)</span>}</span>
          <span className="text-vigno-muted">Role</span><span className="capitalize">{user?.role}</span>
        </div>
      </Card>

      <Card title="Account Verification"><EmailVerification /></Card>
      <Card title="Two-Factor Authentication"><TwoFactor /></Card>
      <Card title="Change Password"><ChangePassword /></Card>
      <Card title="My Devices"><Devices /></Card>
    </div>
  )
}
