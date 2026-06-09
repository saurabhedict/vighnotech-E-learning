import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authApi, apiErrorMessage } from '../api/authApi'
import { useSiteSettings } from '../hooks/useSiteSettings'

// Two-step reset: request a code, then set a new password with it.
export default function ForgotPassword() {
  const navigate = useNavigate()
  const { data: settings } = useSiteSettings()
  const brandName = settings?.brand?.name || 'AeroLearn'
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [msg, setMsg] = useState(null)
  const [loading, setLoading] = useState(false)

  const input = 'w-full mb-3.5 px-3 py-2.5 rounded-lg bg-vigno-bg2 border border-vigno-line text-sm outline-none focus:border-vigno-accent'

  const request = async (e) => {
    e.preventDefault()
    setMsg(null); setLoading(true)
    try {
      const r = await authApi.forgotPassword(email)
      setMsg({ ok: true, text: r.message || 'If that email is registered, a reset code has been sent.' })
      setStep(2)
    } catch (err) {
      setMsg({ ok: false, text: apiErrorMessage(err) })
    } finally { setLoading(false) }
  }

  const reset = async (e) => {
    e.preventDefault()
    setMsg(null); setLoading(true)
    try {
      await authApi.resetPassword(email, code.trim(), newPassword)
      setMsg({ ok: true, text: 'Password reset. Redirecting to sign in…' })
      setTimeout(() => navigate('/'), 1200)
    } catch (err) {
      setMsg({ ok: false, text: apiErrorMessage(err, 'Reset failed') })
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5">
      <div className="bg-vigno-panel border border-vigno-line rounded-2xl p-8 w-[380px] shadow-2xl">
        <h2 className="text-xl font-bold mb-1"><span className="text-vigno-accent2">✈</span> {brandName}</h2>
        <p className="text-vigno-muted text-sm mb-5">Reset your password</p>

        {msg && (
          <div className={'mb-4 text-sm rounded-lg px-3 py-2 border ' +
            (msg.ok ? 'bg-green-500/15 border-green-500/40 text-green-200' : 'bg-red-500/15 border-red-500/40 text-red-200')}>
            {msg.text}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={request}>
            <label className="text-xs text-vigno-muted block mb-1.5">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={input} />
            <button disabled={loading} className="w-full bg-vigno-accent text-[#1a0d0f] font-extrabold py-3 rounded-xl hover:brightness-110 disabled:opacity-60">
              {loading ? 'Sending…' : 'Send reset code'}
            </button>
          </form>
        ) : (
          <form onSubmit={reset}>
            <label className="text-xs text-vigno-muted block mb-1.5">Reset code (from your email)</label>
            <input value={code} onChange={(e) => setCode(e.target.value)} required className={input + ' tracking-widest'} placeholder="123456" />
            <label className="text-xs text-vigno-muted block mb-1.5">New password (min 8)</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className={input} />
            <button disabled={loading} className="w-full bg-vigno-accent text-[#1a0d0f] font-extrabold py-3 rounded-xl hover:brightness-110 disabled:opacity-60">
              {loading ? 'Resetting…' : 'Reset password'}
            </button>
            <button type="button" onClick={() => setStep(1)} className="w-full mt-2 text-xs text-vigno-muted hover:text-vigno-txt">← Use a different email</button>
          </form>
        )}

        <p className="text-xs text-vigno-muted mt-4 text-center">
          <Link to="/" className="text-vigno-accent2 hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}
