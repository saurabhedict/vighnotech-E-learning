import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { authApi, apiErrorMessage } from '../api/authApi'
import { useSiteSettings } from '../hooks/useSiteSettings'
import logoIcon from '../assets/logo-icon.svg'

// Two-step reset: request a code, then set a new password with it.
export default function ForgotPassword() {
  const navigate = useNavigate()
  const theme = useSelector((s) => s.ui.theme)
  const isDark = theme === 'dark'
  const { data: settings } = useSiteSettings()
  const brandName = settings?.brand?.name || 'Vighnesh Inc.'
  const tagline = settings?.brand?.tagline || 'An E-Immersive Learning Platform'

  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [msg, setMsg] = useState(null)
  const [loading, setLoading] = useState(false)

  const inputCls = [
    'w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200',
    'bg-vigno-bg1 border border-vigno-line',
    'text-vigno-txt placeholder-vigno-muted/50',
  ].join(' ')

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
    <div className={(isDark ? '' : 'theme-light ') + 'relative min-h-screen flex items-center justify-center p-5 z-10'}>
      {/* Horizon glow */}
      <div className="fixed bottom-0 left-0 right-0 h-40 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(77,166,255,0.06) 0%, transparent 100%)' }} />

      <div className="w-full max-w-sm">
        {/* Logo & brand */}
        <div className="text-center mb-8">
          <img src={logoIcon} alt={brandName} className="w-14 h-14 mx-auto mb-3 select-none" draggable={false} />
          <h1 className="text-2xl font-bold text-vigno-txt tracking-tight">{brandName}</h1>
          <p className="text-vigno-muted text-xs tracking-widest uppercase mt-1">{tagline}</p>
        </div>

        {/* Card */}
        <div
          className="auth-card rounded-2xl border border-vigno-line shadow-2xl overflow-hidden"
          style={isDark
            ? { background: 'linear-gradient(160deg, #0d1829 0%, #0a1422 100%)', backdropFilter: 'blur(12px)' }
            : { background: '#ffffff' }
          }
        >
          <div className="p-8">
            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-6">
              <div className={`flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-extrabold transition-all ${step === 1 ? 'bg-vigno-accent text-vigno-accent-txt' : 'bg-green-500/20 text-green-400'}`}>
                {step === 1 ? '1' : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l5 5L19.5 6.25" />
                  </svg>
                )}
              </div>
              <div className={`flex-1 h-px transition-colors ${step === 2 ? 'bg-vigno-accent/40' : 'bg-vigno-line/40'}`} />
              <div className={`flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-extrabold transition-all ${step === 2 ? 'bg-vigno-accent text-vigno-accent-txt' : 'bg-vigno-line/30 text-vigno-muted'}`}>
                2
              </div>
            </div>

            {step === 1 ? (
              <>
                <h2 className="text-lg font-bold text-vigno-txt mb-1">Forgot your password?</h2>
                <p className="text-vigno-muted text-xs mb-6">Enter your email and we'll send you a reset code.</p>

                {msg && (
                  <div className={`mb-5 text-xs rounded-xl px-4 py-3 border ${msg.ok ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                    {msg.text}
                  </div>
                )}

                <form onSubmit={request} className="space-y-4">
                  <div>
                    <label className="text-xs text-vigno-muted block mb-1.5 font-medium">Email address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      placeholder="you@example.com"
                      className={inputCls}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl font-extrabold text-sm tracking-wide transition-all duration-200 disabled:opacity-60 bg-vigno-accent text-vigno-accent-txt shadow-lg shadow-vigno-accent/20 hover:brightness-110"
                  >
                    {loading ? 'Sending…' : 'Send Reset Code →'}
                  </button>

                  <p className="text-xs text-vigno-muted text-center pt-1">
                    Remember it?{' '}
                    <Link to="/" className="text-vigno-accent2 font-semibold hover:underline">Back to sign in</Link>
                  </p>
                </form>
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold text-vigno-txt mb-1">Enter your reset code</h2>
                <p className="text-vigno-muted text-xs mb-6">
                  Check your inbox at <span className="text-vigno-txt font-semibold">{email}</span> for the 6-digit code.
                </p>

                {msg && (
                  <div className={`mb-5 text-xs rounded-xl px-4 py-3 border ${msg.ok ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                    {msg.text}
                  </div>
                )}

                <form onSubmit={reset} className="space-y-4">
                  <div>
                    <label className="text-xs text-vigno-muted block mb-1.5 font-medium">Reset code</label>
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      required
                      placeholder="123456"
                      autoFocus
                      className={inputCls + ' tracking-[0.4em] text-center text-lg font-bold'}
                    />
                  </div>

                  <div>
                    <label className="text-xs text-vigno-muted block mb-1.5 font-medium">New password (min 8 chars)</label>
                    <div className="relative">
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        className={inputCls + ' pr-10'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass((p) => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-vigno-muted hover:text-vigno-accent2 transition-colors flex items-center justify-center"
                      >
                        {showPass ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.822 7.822L21 21m-2.228-2.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl font-extrabold text-sm tracking-wide transition-all duration-200 disabled:opacity-60 bg-vigno-accent text-vigno-accent-txt shadow-lg shadow-vigno-accent/20 hover:brightness-110"
                  >
                    {loading ? 'Resetting…' : 'Reset Password →'}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setStep(1); setMsg(null); setCode(''); setNewPassword('') }}
                    className="w-full text-xs text-vigno-muted hover:text-vigno-txt transition-colors text-center"
                  >
                    ← Use a different email
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-[10px] text-vigno-muted/40 mt-6">
          {brandName} © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
