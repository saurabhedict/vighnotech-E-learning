import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { setUser, logout } from '../store/authSlice'
import { authApi, apiErrorMessage } from '../api/authApi'
import { devicesApi } from '../api/devicesApi'
import { getDeviceFingerprint, deviceLabel } from '../lib/device'
import VerifyContact from '../components/VerifyContact'
import AvatarUploader from '../components/AvatarUploader'
import Modal from '../components/Modal'
import CountrySelect from '../components/CountrySelect'
import Breadcrumb from '../components/Breadcrumb'
import { DIAL_CODES } from '../lib/countryCodes'

function Card({ title, icon, children }) {
  return (
    <section className="max-w-2xl bg-vigno-card border border-vigno-line rounded-2xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-3.5 pb-2 border-b border-vigno-line/30">
        {icon && <span className="text-vigno-accent shrink-0">{icon}</span>}
        <h2 className="text-sm font-bold text-vigno-txt">{title}</h2>
      </div>
      {children}
    </section>
  )
}

const input = 'w-full mb-3 px-3 py-2.5 rounded-lg bg-vigno-bg2 border border-vigno-line text-sm outline-none'
const btn = 'bg-vigno-accent text-vigno-accent-txt font-bold px-4 py-2 rounded-lg hover:brightness-110 disabled:opacity-60'
const btnGhost = 'bg-white/10 hover:bg-white/20 border border-vigno-line rounded-lg px-3 py-2 text-sm disabled:opacity-60'

// Split a stored E.164 number into { cc, national(last 10 digits) }.
function splitPhone(full) {
  const digits = String(full || '').replace(/\D/g, '')
  if (digits.length >= 10) {
    const national = digits.slice(-10)
    const cc = '+' + digits.slice(0, -10)
    return { cc: DIAL_CODES.has(cc) ? cc : '+91', national }
  }
  return { cc: '+91', national: digits }
}

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
      <button disabled={loading} className={btn + ' w-full'}>{loading ? 'Saving…' : 'Change Password'}</button>
    </form>
  )
}

function AddPhone() {
  const dispatch = useDispatch()
  const user = useSelector((s) => s.auth.user)
  const initial = splitPhone(user?.phone)
  const [cc, setCc] = useState(initial.cc)
  const [national, setNational] = useState(initial.national)
  const [msg, setMsg] = useState(null)
  const [loading, setLoading] = useState(false)

  const valid = national.length === 10
  const submit = async (e) => {
    e.preventDefault(); setMsg(null)
    if (!valid) return setMsg({ ok: false, text: 'Enter exactly 10 digits.' })
    setLoading(true)
    try {
      const r = await authApi.setPhone(`${cc}${national}`)
      dispatch(setUser(r.user))
      setMsg({ ok: true, text: 'Number saved. Close this and tap “Verify” to confirm it.' })
    } catch (err) { setMsg({ ok: false, text: apiErrorMessage(err, 'Could not save number') }) }
    finally { setLoading(false) }
  }

  const numCls = 'flex-1 px-3 py-2.5 rounded-lg bg-vigno-bg2 border border-vigno-line text-sm outline-none tracking-wider'
  return (
    <form onSubmit={submit}>
      <Msg msg={msg} />
      <label className="text-xs text-vigno-muted block mb-1.5">Phone number</label>
      <div className="flex gap-2 mb-1">
        <CountrySelect value={cc} onChange={setCc} />
        <input
          value={national}
          onChange={(e) => setNational(e.target.value.replace(/\D/g, '').slice(0, 10))}
          inputMode="numeric"
          maxLength={10}
          placeholder="10-digit number"
          className={numCls}
        />
      </div>
      <p className={'text-xs mb-3 ' + (valid ? 'text-green-300' : 'text-vigno-muted')}>
        {valid ? '✓ Looks good' : `Enter exactly 10 digits (${national.length}/10)`}
      </p>
      <button disabled={loading || !valid} className={btn + ' w-full'}>{loading ? 'Saving…' : 'Save Number'}</button>
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
        <p className="text-sm text-green-300 mb-3 text-center">✓ Two-factor is ON ({user.twoFAMethod === 'totp' ? 'authenticator app' : 'email codes'}).</p>
        <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="Confirm password" className={input + ' w-full mb-2'} />
        <div className="flex gap-2 justify-center flex-wrap">
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
      <p className="text-sm text-vigno-muted mb-3">Add a second step at sign-in. Choose a method:</p>

      {!setup ? (
        <div className="flex flex-col gap-2.5">
          {/* Authenticator app */}
          <div className="flex items-center gap-3 bg-black/20 rounded-lg p-3">
            <span className="text-xl">📱</span>
            <div className="flex-1">
              <div className="text-sm font-semibold">Authenticator app</div>
              <div className="text-xs text-vigno-muted">Google Authenticator / Authy — works offline.</div>
            </div>
            <button onClick={startTotp} disabled={loading} className={btn}>{loading ? '…' : 'Set up'}</button>
          </div>

          {/* Email OTP codes */}
          <div className="flex items-center gap-3 bg-black/20 rounded-lg p-3">
            <span className="text-xl">✉️</span>
            <div className="flex-1">
              <div className="text-sm font-semibold">Email codes (OTP)</div>
              <div className="text-xs text-vigno-muted">
                {user?.emailVerified
                  ? 'A one-time code is emailed to you at each sign-in.'
                  : "Verify your email first — use “Verify Account” in Security."}
              </div>
            </div>
            {user?.emailVerified
              ? <button onClick={enableEmail} disabled={loading} className={btn}>{loading ? '…' : 'Enable'}</button>
              : <span className="text-xs text-vigno-accent2 whitespace-nowrap">Verify email first</span>}
          </div>
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
        Downloadable software is bound to a registered device. A copied
        encrypted file won't unlock elsewhere.
      </p>
      {err && <p className="text-sm text-red-300 mb-2">{err}</p>}
      <button onClick={register} disabled={busy} className={btnGhost + ' mb-4'}>{busy ? 'Registering…' : '+ Register this device'}</button>
      {devices.isLoading && <p className="text-vigno-muted text-sm">Loading devices…</p>}
      {devices.data?.length === 0 && <p className="text-vigno-muted text-sm">No devices registered.</p>}
      <ul className="flex flex-col gap-2">
        {devices.data?.map((d) => (
          <li key={d.id} className="flex items-center justify-between bg-black/20 rounded-lg px-3 py-2 text-sm">
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-vigno-muted" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="2" y="3" width="20" height="13" rx="2" />
                <path d="M2 16h20M12 16v4M8 20h8" />
              </svg>
              <span>{d.name || 'Device'}</span>
            </span>
            <span className="text-xs text-vigno-muted">last seen {new Date(d.lastSeenAt).toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function DeleteAccount() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [pwd, setPwd] = useState('')
  const [confirm, setConfirm] = useState('')
  const [msg, setMsg] = useState(null)
  const [loading, setLoading] = useState(false)

  const del = async (e) => {
    e.preventDefault()
    setMsg(null)
    if (confirm.trim().toUpperCase() !== 'DELETE') return setMsg({ ok: false, text: 'Type DELETE to confirm.' })
    setLoading(true)
    try {
      await authApi.deleteAccount(pwd)
      dispatch(logout())
      navigate('/')
    } catch (err) {
      setMsg({ ok: false, text: apiErrorMessage(err, 'Could not delete account') })
    } finally { setLoading(false) }
  }

  return (
    <form onSubmit={del}>
      <Msg msg={msg} />
      <p className="text-sm text-vigno-muted mb-3">
        This permanently deletes your account and all your data (licenses, purchases, devices). This cannot be undone.
      </p>
      <label className="text-xs text-vigno-muted block mb-1.5">Confirm your password</label>
      <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} className={input} autoComplete="current-password" />
      <label className="text-xs text-vigno-muted block mb-1.5">Type <b className="text-red-300">DELETE</b> to confirm</label>
      <input value={confirm} onChange={(e) => setConfirm(e.target.value)} className={input} placeholder="DELETE" />
      <button disabled={loading || !pwd}
        className="w-full bg-red-500/90 hover:bg-red-500 text-white font-bold rounded-lg py-2.5 text-sm disabled:opacity-50">
        {loading ? 'Deleting…' : 'Permanently delete my account'}
      </button>
    </form>
  )
}

function ActionTile({ icon, label, sub, onClick, danger }) {
  return (
    <button onClick={onClick}
      className={'flex items-center gap-3 text-left rounded-xl px-4 py-3 border transition w-full ' +
        (danger
          ? 'border-red-500/40 bg-red-500/5 hover:bg-red-500/10'
          : 'border-vigno-line bg-vigno-bg2 hover:bg-vigno-bg3/50')}>
      <span className="w-7 flex items-center justify-center shrink-0">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className={'block font-semibold text-sm ' + (danger ? 'text-red-300' : '')}>{label}</span>
        <span className="block text-xs text-vigno-muted truncate">{sub}</span>
      </span>
      <span className="text-vigno-muted">›</span>
    </button>
  )
}

export default function Profile() {
  const user = useSelector((s) => s.auth.user)
  const [modal, setModal] = useState(null)
  const close = () => setModal(null)
  const verified = user?.emailVerified || user?.phoneVerified

  return (
    <div className="max-w-3xl">
      <Breadcrumb trail="Profile" />
      <h1 className="text-2xl mb-5 flex items-center gap-2">
        <svg className="w-6 h-6 text-vigno-txt shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <span>Profile</span>
      </h1>

      {/* Account */}
      <Card title="Account" icon={
        <svg className="w-5 h-5" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      }>
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="text-center">
            <AvatarUploader size={84} />
            <div className="mt-2.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-vigno-muted/80 bg-white/5 border border-vigno-line/45 rounded-full px-3 py-1 inline-block select-none">
                Click photo to edit
              </span>
            </div>
          </div>
          <div className="grid grid-cols-[100px_1fr] gap-y-3.5 gap-x-4 text-sm flex-1 w-full">
            <span className="text-vigno-muted flex items-center">Name</span>
            <span className="font-semibold text-vigno-txt flex items-center">{user?.name || '—'}</span>
            
            <span className="text-vigno-muted flex items-center">Email</span>
            <span className="flex items-center gap-2.5 flex-wrap">
              <span className="font-semibold text-vigno-txt">{user?.email}</span>
              {verified ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500/12 text-green-400 border border-green-500/25 select-none">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.746 3.746 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                  </svg>
                  <span>Verified</span>
                </span>
              ) : (
                <>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/12 text-amber-400 border border-amber-500/25 select-none">
                    Unverified
                  </span>
                  <button onClick={() => setModal('verify')} className="text-xs font-bold text-vigno-accent2 hover:underline transition-colors">
                    Verify now →
                  </button>
                </>
              )}
            </span>
            
            <span className="text-vigno-muted flex items-center">Phone</span>
            <span className="flex items-center gap-2.5 flex-wrap">
              {user?.phone ? (
                <>
                  <span className="font-semibold text-vigno-txt">{user.phone}</span>
                  {user.phoneVerified ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500/12 text-green-400 border border-green-500/25 select-none">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.746 3.746 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                      </svg>
                      <span>Verified</span>
                    </span>
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/12 text-amber-400 border border-amber-500/25 select-none">
                        Unverified
                      </span>
                      <button onClick={() => setModal('addPhone')}
                        className="text-[11px] font-semibold bg-white/10 hover:bg-white/20 border border-vigno-line rounded-md px-2 py-0.5 transition-colors">
                        Edit
                      </button>
                      <button onClick={() => setModal('verifyPhone')}
                        className="text-[11px] font-semibold bg-vigno-accent text-vigno-accent-txt rounded-md px-2.5 py-0.5 hover:brightness-110 transition-all">
                        Verify
                      </button>
                    </>
                  )}
                </>
              ) : (
                <>
                  <span className="text-vigno-muted">Not added</span>
                  <button onClick={() => setModal('addPhone')}
                    className="text-[11px] font-semibold bg-white/10 hover:bg-white/20 border border-vigno-line rounded-md px-2.5 py-0.5 transition-colors">
                    Add Number
                  </button>
                </>
              )}
            </span>
            
            <span className="text-vigno-muted flex items-center">Role</span>
            <span className="capitalize font-semibold text-vigno-txt flex items-center">{user?.role}</span>
          </div>
        </div>
      </Card>

      {/* Security */}
      <Card title="Security" icon={
        <svg className="w-5 h-5" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      }>
        <div className="grid sm:grid-cols-2 gap-3">
          <ActionTile
            icon={
              <svg className="w-5 h-5 text-amber-400 mx-auto shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m-3.414 5.414L9 18H6v-3l4.586-4.586a5 5 0 111.414 1.414z" />
              </svg>
            }
            label="Change Password"
            sub="Update your password"
            onClick={() => setModal('password')}
          />
          <ActionTile
            icon={
              <svg className="w-5 h-5 text-orange-400 mx-auto shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            }
            label="Two-Factor Authentication"
            sub={user?.twoFAEnabled ? `On · ${user.twoFAMethod === 'totp' ? 'authenticator app' : 'email codes'}` : 'Off — add a second step'}
            onClick={() => setModal('2fa')}
          />
          <ActionTile
            icon={
              <svg className="w-5 h-5 text-blue-400 mx-auto shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="2" y="3" width="20" height="13" rx="2" />
                <path d="M2 16h20M12 16v4M8 20h8" />
              </svg>
            }
            label="My Devices"
            sub="Devices bound for downloads"
            onClick={() => setModal('devices')}
          />
          {!verified && (
            <ActionTile
              icon={
                <svg className="w-5 h-5 text-green-400 mx-auto shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.746 3.746 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                </svg>
              }
              label="Verify Account"
              sub="Email / SMS / WhatsApp"
              onClick={() => setModal('verify')}
            />
          )}
        </div>
      </Card>

      {/* Danger zone */}
      <section className="max-w-2xl border border-red-500/40 bg-red-500/5 rounded-2xl p-5 mb-6">
        <h2 className="text-base font-bold mb-1 text-red-300 flex items-center gap-1.5">
          <svg className="w-5 h-5 text-red-300 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Danger Zone</span>
        </h2>
        <p className="text-xs text-vigno-muted mb-3">Permanently delete your account and all associated data.</p>
        <button onClick={() => setModal('delete')}
          className="bg-red-500/80 hover:bg-red-500 text-white font-bold px-4 py-2 rounded-lg text-sm">Delete Account</button>
      </section>

      {modal === 'password' && <Modal title="Change Password" onClose={close}><ChangePassword /></Modal>}
      {modal === '2fa' && <Modal title="Two-Factor Authentication" width={460} onClose={close}><TwoFactor /></Modal>}
      {modal === 'devices' && <Modal title="My Devices" width={460} onClose={close}><Devices /></Modal>}
      {modal === 'verify' && <Modal title="Verify Account" onClose={close}><VerifyContact defaultPhone={user?.phone || ''} onVerified={close} /></Modal>}
      {modal === 'addPhone' && <Modal title={user?.phone ? 'Edit Phone Number' : 'Add Phone Number'} overflowVisible onClose={close}><AddPhone /></Modal>}
      {modal === 'verifyPhone' && <Modal title="Verify Phone Number" onClose={close}><VerifyContact phoneOnly defaultPhone={user?.phone || ''} onVerified={close} /></Modal>}
      {modal === 'delete' && <Modal title="Delete Account" onClose={close}><DeleteAccount /></Modal>}
    </div>
  )
}
