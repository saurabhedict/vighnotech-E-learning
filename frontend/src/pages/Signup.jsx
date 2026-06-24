import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { setCredentials } from '../store/authSlice'
import { authApi, apiErrorMessage } from '../api/authApi'
import VerifyContact from '../components/VerifyContact'
import { useSiteSettings } from '../hooks/useSiteSettings'

function PasswordRule({ ok, label }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className={ok ? 'text-green-400' : 'text-vigno-muted/60'}>{ok ? '●' : '○'}</span>
      <span className={ok ? 'text-green-300' : 'text-vigno-muted/60'}>{label}</span>
    </div>
  )
}

export default function Signup() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const theme = useSelector((s) => s.ui.theme)
  const isDark = theme === 'dark'
  const { data: settings } = useSiteSettings()
  const brandName = settings?.brand?.name || 'Aerolearn'
  const logoEmoji = settings?.brand?.logoEmoji ?? '✈'
  const signupSubtitle = settings?.auth?.signupSubtitle || `Join the ${brandName} community`

  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [otpMethod, setOtpMethod] = useState('email')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const pw = form.password
  const rules = {
    len: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    num: /[0-9]/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  }

  const inputCls = [
    'w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200',
    'bg-vigno-bg1 border border-vigno-line',
    'text-vigno-txt placeholder-vigno-muted/50',
  ].join(' ')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!rules.len) return setError('Password must be at least 8 characters')
    setLoading(true)
    try {
      const { user, token } = await authApi.signup(form.email, form.password, form.name, form.phone)
      dispatch(setCredentials({ user, token }))
      setStep(2)
    } catch (err) {
      setError(apiErrorMessage(err, 'Signup failed'))
    } finally { setLoading(false) }
  }

  return (
    <div className={(isDark ? '' : 'theme-light ') + 'relative min-h-screen flex items-center justify-center p-5 z-10'}>
      <div className="fixed bottom-0 left-0 right-0 h-40 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(77,166,255,0.06) 0%, transparent 100%)' }} />

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <span style={{ fontFamily: "'Caveat', cursive" }} className="text-4xl font-bold select-none text-vigno-txt">{brandName}</span>
          </div>
          <p className="text-vigno-muted text-xs tracking-widest uppercase">Start your exam preparation journey</p>
        </div>

        {/* Card */}
        <div
          className="auth-card rounded-2xl border border-vigno-line shadow-2xl overflow-hidden"
          style={isDark
            ? { background: 'linear-gradient(160deg, #0d1829 0%, #0a1422 100%)' }
            : { background: '#ffffff' }
          }
        >
          <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #4da6ff, #f0c040, #4da6ff)' }} />

          <div className="p-8">
            {step === 1 ? (
              <>
                <h2 className="text-lg font-bold text-vigno-txt mb-1">Create Account</h2>
                <p className="text-vigno-muted text-xs mb-6">{signupSubtitle}</p>

                {error && (
                  <div className="mb-4 text-xs bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg px-3 py-2">{error}</div>
                )}

                <form onSubmit={submit} className="space-y-4">
                  <div>
                    <label className="text-xs text-vigno-muted block mb-1.5 font-medium">Full Name</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center">
                        <svg className="w-4 h-4 text-vigno-muted/50" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </span>
                      <input value={form.name} onChange={set('name')} autoComplete="name"
                        placeholder="Full Name" className={inputCls + ' pl-10'} />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-vigno-muted block mb-1.5 font-medium">Email</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center">
                        <svg className="w-4 h-4 text-vigno-muted/50" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </span>
                      <input type="email" value={form.email} onChange={set('email')} required
                        autoComplete="email" placeholder="Email" className={inputCls + ' pl-10'} />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-vigno-muted block mb-1.5 font-medium">Password</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center">
                        <svg className="w-4 h-4 text-vigno-muted/50" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </span>
                      <input type={showPass ? 'text' : 'password'} value={form.password}
                        onChange={set('password')} required autoComplete="new-password"
                        placeholder="Password (min 8, uppercase, number, special)"
                        className={inputCls + ' pl-10 pr-10'} />
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
                    {form.password.length > 0 && (
                      <div className="mt-2 grid grid-cols-2 gap-1 bg-vigno-bg1 rounded-lg px-3 py-2 border border-vigno-line">
                        <PasswordRule ok={rules.len} label="At least 8 characters" />
                        <PasswordRule ok={rules.upper} label="At least 1 uppercase" />
                        <PasswordRule ok={rules.num} label="At least 1 number" />
                        <PasswordRule ok={rules.special} label="At least 1 special" />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs text-vigno-muted block mb-1.5 font-medium">Phone Number (Indian)</label>
                    <div className="flex gap-2">
                      <div className="flex items-center bg-vigno-bg1 border border-vigno-line rounded-xl px-3.5 text-sm text-vigno-muted whitespace-nowrap">
                        +91
                      </div>
                      <input value={form.phone} onChange={set('phone')} autoComplete="tel"
                        placeholder="Phone Number" className={inputCls} />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-vigno-muted block mb-2 font-medium">Receive OTP via</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['email', 'sms'].map(m => (
                        <button key={m} type="button" onClick={() => setOtpMethod(m)}
                          className={[
                            'py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 border',
                            otpMethod === m
                              ? 'border-vigno-accent2 text-vigno-accent2 bg-vigno-accent2/10'
                              : 'border-vigno-line text-vigno-muted bg-transparent hover:border-vigno-accent2/40',
                          ].join(' ')}>
                          {m === 'email' ? (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              <span>Email</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                              <span>SMS</span>
                            </>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button type="submit" disabled={loading}
                    className="w-full py-3 rounded-xl font-extrabold text-sm tracking-wide transition-all duration-200 disabled:opacity-60 mt-2 bg-vigno-accent text-vigno-accent-txt shadow-lg shadow-vigno-accent/20 hover:brightness-110">
                    {loading ? 'Creating account…' : 'Create Account'}
                  </button>

                  <p className="text-xs text-vigno-muted text-center pt-1">
                    Already have an account?{' '}
                    <Link to="/" className="text-vigno-accent2 font-semibold hover:underline">Login</Link>
                  </p>
                </form>
              </>
            ) : (
              <div>
                <h2 className="text-lg font-bold text-vigno-txt mb-1">Verify Account</h2>
                <div className="flex items-center gap-2 text-sm text-green-300 mb-4 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
                  <span>✓</span>
                  <span>Account created! Let's verify it.</span>
                </div>
                <VerifyContact defaultPhone={form.phone} onVerified={() => navigate('/app')} />
                <button onClick={() => navigate('/app')}
                  className="w-full mt-4 text-xs text-vigno-muted hover:text-vigno-txt transition-colors">Skip for now →</button>
              </div>
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
