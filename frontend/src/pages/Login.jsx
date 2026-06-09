import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { setCredentials } from '../store/authSlice'
import { authApi, apiErrorMessage } from '../api/authApi'
import { useSiteSettings } from '../hooks/useSiteSettings'

export default function Login() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { data: settings } = useSiteSettings()
  const brandName = settings?.brand?.name || 'AeroLearn'
  const tagline = settings?.brand?.tagline || 'Aviation Training Platform'
  const logoEmoji = settings?.brand?.logoEmoji ?? '✈'
  const greeting = settings?.auth?.loginGreeting || 'Welcome back'
  const loginSubtitle = settings?.auth?.loginSubtitle || 'Sign in to continue'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // Explain an unexpected sign-out (session expired or signed in elsewhere).
  useEffect(() => {
    try {
      if (sessionStorage.getItem('vigno_session_ended')) {
        setNotice('Your session ended — you may have signed in on another device. Please sign in again.')
        sessionStorage.removeItem('vigno_session_ended')
      }
    } catch { /* ignore */ }
  }, [])
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const [challenge, setChallenge] = useState(null)
  const [method, setMethod] = useState(null)
  const [code, setCode] = useState('')

  const finish = (user, token) => {
    dispatch(setCredentials({ user, token }))
    navigate(user.role === 'admin' ? '/app/admin' : '/app/PPL_Ground')
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await authApi.login(email, password)
      if (res.twoFARequired) { setChallenge(res.challenge); setMethod(res.method) }
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
    'focus:border-vigno-accent2 focus:ring-2 focus:ring-vigno-accent2/20',
  ].join(' ')

  return (
    <div className="relative min-h-screen flex items-center justify-center p-5 z-10">
      {/* Horizon glow */}
      <div className="fixed bottom-0 left-0 right-0 h-40 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(77,166,255,0.06) 0%, transparent 100%)' }} />

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="text-3xl">{logoEmoji}</span>
            <span className="text-2xl font-black tracking-tight text-vigno-txt">{brandName}</span>
          </div>
          <p className="text-vigno-muted text-xs tracking-widest uppercase">{tagline}</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-vigno-line shadow-2xl overflow-hidden"
          style={{ background: 'linear-gradient(160deg, #0d1829 0%, #0a1422 100%)', backdropFilter: 'blur(12px)' }}>

          {/* Card header stripe */}
          <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #4da6ff, #f0c040, #4da6ff)' }} />

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
                    <input
                      name="email" value={email}
                      onChange={e => setEmail(e.target.value)}
                      autoComplete="email" placeholder="you@example.com"
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className="text-xs text-vigno-muted block mb-1.5 font-medium">Password</label>
                    <div className="relative">
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        autoComplete="current-password"
                        className={inputCls + ' pr-10'}
                      />
                      <button type="button" onClick={() => setShowPass(p => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-vigno-muted hover:text-vigno-accent2 transition-colors text-xs">
                        {showPass ? '🙈' : '👁'}
                      </button>
                    </div>
                    <div className="text-right mt-1">
                      <Link to="/forgot-password" className="text-xs text-vigno-accent2 hover:underline">Forgot password?</Link>
                    </div>
                  </div>

                  <button type="submit" disabled={loading}
                    className="w-full py-3 rounded-xl font-extrabold text-sm tracking-wide transition-all duration-200 disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg, #f0c040, #f0a020)', color: '#0a0f1e', boxShadow: '0 4px 20px rgba(240,192,64,0.3)' }}>
                    {loading ? 'Signing in…' : 'Sign In'}
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
                {error && (
                  <div className="mb-4 text-xs bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg px-3 py-2">{error}</div>
                )}
                <input autoFocus value={code} onChange={e => setCode(e.target.value)}
                  placeholder="123456" className={inputCls + ' tracking-widest text-center text-lg'} />
                <button type="submit" disabled={loading}
                  className="w-full py-3 rounded-xl font-extrabold text-sm transition-all disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #f0c040, #f0a020)', color: '#0a0f1e' }}>
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
