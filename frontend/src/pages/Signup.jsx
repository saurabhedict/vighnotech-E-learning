import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { setCredentials } from '../store/authSlice'
import { authApi, apiErrorMessage } from '../api/authApi'
import VerifyContact from '../components/VerifyContact'
import { useSiteSettings } from '../hooks/useSiteSettings'

function PasswordRule({ ok, label }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className={ok ? 'text-green-400' : 'text-vigno-muted/60'}>
        {ok ? '●' : '○'}
      </span>
      <span className={ok ? 'text-green-300' : 'text-vigno-muted/60'}>{label}</span>
    </div>
  )
}

export default function Signup() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { data: settings } = useSiteSettings()
  const brandName = settings?.brand?.name || 'AeroLearn'
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
    'focus:border-vigno-accent2 focus:ring-2 focus:ring-vigno-accent2/20',
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
    <div className="relative min-h-screen flex items-center justify-center p-5 z-10">
      <div className="fixed bottom-0 left-0 right-0 h-40 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(77,166,255,0.06) 0%, transparent 100%)' }} />

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="text-3xl">{logoEmoji}</span>
            <span className="text-2xl font-black tracking-tight text-vigno-txt">{brandName}</span>
          </div>
          <p className="text-vigno-muted text-xs tracking-widest uppercase">Start your exam preparation journey</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-vigno-line shadow-2xl overflow-hidden"
          style={{ background: 'linear-gradient(160deg, #0d1829 0%, #0a1422 100%)' }}>

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
                  {/* Full Name */}
                  <div>
                    <label className="text-xs text-vigno-muted block mb-1.5 font-medium">Full Name</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-vigno-muted/50 text-sm">👤</span>
                      <input value={form.name} onChange={set('name')} autoComplete="name"
                        placeholder="Full Name" className={inputCls + ' pl-9'} />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="text-xs text-vigno-muted block mb-1.5 font-medium">Email</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-vigno-muted/50 text-sm">✉️</span>
                      <input type="email" value={form.email} onChange={set('email')} required
                        autoComplete="email" placeholder="Email" className={inputCls + ' pl-9'} />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="text-xs text-vigno-muted block mb-1.5 font-medium">Password</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-vigno-muted/50 text-sm">🔒</span>
                      <input type={showPass ? 'text' : 'password'} value={form.password}
                        onChange={set('password')} required autoComplete="new-password"
                        placeholder="Password (min 8, uppercase, number, special)"
                        className={inputCls + ' pl-9 pr-10'} />
                      <button type="button" onClick={() => setShowPass(p => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-vigno-muted hover:text-vigno-accent2 transition-colors text-xs">
                        {showPass ? '🙈' : '👁'}
                      </button>
                    </div>
                    {/* Password rules */}
                    {form.password.length > 0 && (
                      <div className="mt-2 grid grid-cols-2 gap-1 bg-vigno-bg1 rounded-lg px-3 py-2 border border-vigno-line">
                        <PasswordRule ok={rules.len} label="At least 8 characters" />
                        <PasswordRule ok={rules.upper} label="At least 1 uppercase" />
                        <PasswordRule ok={rules.num} label="At least 1 number" />
                        <PasswordRule ok={rules.special} label="At least 1 special" />
                      </div>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="text-xs text-vigno-muted block mb-1.5 font-medium">Phone Number (Indian)</label>
                    <div className="flex gap-2">
                      <div className="flex items-center gap-1 bg-vigno-bg1 border border-vigno-line rounded-xl px-3 text-sm text-vigno-muted whitespace-nowrap">
                        🇮🇳 +91
                      </div>
                      <input value={form.phone} onChange={set('phone')} autoComplete="tel"
                        placeholder="Phone Number (Indian)" className={inputCls} />
                    </div>
                  </div>

                  {/* OTP method selector */}
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
                          {m === 'email' ? '✉ Email' : '📱 SMS'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button type="submit" disabled={loading}
                    className="w-full py-3 rounded-xl font-extrabold text-sm tracking-wide transition-all duration-200 disabled:opacity-60 mt-2"
                    style={{ background: 'linear-gradient(135deg, #f0c040, #f0a020)', color: '#0a0f1e', boxShadow: '0 4px 20px rgba(240,192,64,0.3)' }}>
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
                <VerifyContact defaultPhone={form.phone} onVerified={() => navigate('/app/PPL_Ground')} />
                <button onClick={() => navigate('/app/PPL_Ground')}
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
