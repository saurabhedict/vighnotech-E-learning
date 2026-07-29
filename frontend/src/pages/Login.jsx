import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { setCredentials } from '../store/authSlice'
import { authApi, apiErrorMessage } from '../api/authApi'
import { useSiteSettings } from '../hooks/useSiteSettings'
import logoIcon from '../assets/logo-icon.svg'

export default function Login() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const theme = useSelector((s) => s.ui.theme)
  const isDark = theme === 'dark'
  const { data: settings } = useSiteSettings()
  const brandName = settings?.brand?.name || 'Vighnesh Inc.'
  const tagline = settings?.brand?.tagline || 'An E-Immersive Learning Platform'
  const greeting = settings?.auth?.loginGreeting || 'Welcome back'
  const loginSubtitle = settings?.auth?.loginSubtitle || 'Sign in to continue'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [challenge, setChallenge] = useState(null)
  const [method, setMethod] = useState(null)
  const [code, setCode] = useState('')

  useEffect(() => {
    try {
      if (sessionStorage.getItem('vigno_session_ended')) {
        setNotice('Your session ended — you may have signed in on another device. Please sign in again.')
        sessionStorage.removeItem('vigno_session_ended')
      }
    } catch { /* ignore */ }
  }, [])

  const finish = (user, token) => {
    dispatch(setCredentials({ user, token }))
    // Clients land straight in their granted courses (My Learning); no catalog.
    navigate(user.role === 'admin' ? '/app/admin' : user.role === 'client' ? '/app/library' : '/app')
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await authApi.login(email, password)
      if (res.twoFARequired) {
        setChallenge(res.challenge); setMethod(res.method)
        // Demo/staging: server returns the code when email delivery isn't configured.
        if (res.devCode) { setCode(res.devCode); setNotice(`Demo code: ${res.devCode} (email delivery isn't configured) — filled in below.`) }
      }
      else finish(res.user, res.token)
    } catch (err) {
      setError(apiErrorMessage(err, 'Login failed'))
    } finally { setLoading(false) }
  }

  const submit2fa = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await authApi.verify2fa(challenge, code.trim())
      finish(res.user, res.token)
    } catch (err) {
      setError(apiErrorMessage(err, 'Invalid code'))
    } finally { setLoading(false) }
  }

  const inputCls = [
    'w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200',
    'bg-vigno-bg1 border border-vigno-line',
    'text-vigno-txt placeholder-vigno-muted/50',
  ].join(' ')

  return (
    <div className={(isDark ? '' : 'theme-light ') + 'relative min-h-screen flex items-center justify-center p-5 z-10'}>
      {/* Horizon glow */}
      <div className="fixed bottom-0 left-0 right-0 h-40 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(77,166,255,0.06) 0%, transparent 100%)' }} />

      <div className="w-full max-w-sm">
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
            {!challenge ? (
              <>
                <h2 className="text-lg font-bold text-vigno-txt mb-1">{greeting}</h2>
                <p className="text-vigno-muted text-xs mb-6">{loginSubtitle}</p>

                {notice && (
                  <div className="mb-4 text-xs bg-vigno-accent2/10 border border-vigno-accent2/30 text-vigno-accent2 rounded-lg px-3 py-2">{notice}</div>
                )}
                {error && (
                  <div className="mb-4 text-xs bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg px-3 py-2">{error}</div>
                )}

                <form onSubmit={submit} className="space-y-4">
                  <div>
                    <label className="text-xs text-vigno-muted block mb-1.5 font-medium">Email</label>
                    <input name="email" value={email} onChange={e => setEmail(e.target.value)}
                      autoComplete="email" placeholder="you@example.com" className={inputCls} />
                  </div>

                  <div>
                    <label className="text-xs text-vigno-muted block mb-1.5 font-medium">Password</label>
                    <div className="relative">
                      <input type={showPass ? 'text' : 'password'} value={password}
                        onChange={e => setPassword(e.target.value)} autoComplete="current-password"
                        className={inputCls + ' pr-10'} />
                      <button type="button" onClick={() => setShowPass(p => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-vigno-muted hover:text-vigno-accent2 transition-colors flex items-center justify-center">
                        {showPass ? (
                          <svg className="w-5 h-5" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.822 7.822L21 21m-2.228-2.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <div className="text-right mt-1">
                      <Link to="/forgot-password" className="text-xs text-vigno-accent2 hover:underline">Forgot password?</Link>
                    </div>
                  </div>

                  <button type="submit" disabled={loading}
                    className="w-full py-3 rounded-xl font-extrabold text-sm tracking-wide transition-all duration-200 disabled:opacity-60 bg-vigno-accent text-vigno-accent-txt shadow-lg shadow-vigno-accent/20 hover:brightness-110">
                    {loading ? 'Signing in…' : 'Sign In →'}
                  </button>

                  <p className="text-xs text-vigno-muted text-center pt-1">
                    New here?{' '}
                    <Link to="/signup" className="text-vigno-accent2 font-semibold hover:underline">Create an account</Link>
                  </p>
                </form>
              </>
            ) : (
              <form onSubmit={submit2fa} className="space-y-4">
                <h2 className="text-lg font-bold text-vigno-txt mb-1">Two-Factor Auth</h2>
                <p className="text-vigno-muted text-xs mb-4">
                  {method === 'email' ? 'Enter the 6-digit code sent to your email.' : 'Enter the code from your authenticator app.'}
                </p>
                {notice && (
                  <div className="mb-4 text-xs bg-vigno-accent2/10 border border-vigno-accent2/30 text-vigno-accent2 rounded-lg px-3 py-2">{notice}</div>
                )}
                {error && (
                  <div className="mb-4 text-xs bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg px-3 py-2">{error}</div>
                )}
                <input autoFocus value={code} onChange={e => setCode(e.target.value)}
                  placeholder="123456" className={inputCls + ' tracking-widest text-center text-lg'} />
                <button type="submit" disabled={loading}
                  className="w-full py-3 rounded-xl font-extrabold text-sm transition-all disabled:opacity-60 bg-vigno-accent text-vigno-accent-txt shadow-lg shadow-vigno-accent/20 hover:brightness-110">
                  {loading ? 'Verifying…' : 'Verify'}
                </button>
                <button type="button" onClick={() => { setChallenge(null); setCode(''); setError('') }}
                  className="w-full text-xs text-vigno-muted hover:text-vigno-txt transition-colors">← Back</button>
              </form>
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
