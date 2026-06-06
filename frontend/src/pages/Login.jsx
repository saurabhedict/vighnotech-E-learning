import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { setCredentials } from '../store/authSlice'
import { authApi, apiErrorMessage } from '../api/authApi'

export default function Login() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [email, setEmail] = useState('cadet@aerolearn.in')
  const [password, setPassword] = useState('password')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // 2FA step state
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
      if (res.twoFARequired) {
        setChallenge(res.challenge)
        setMethod(res.method)
      } else {
        finish(res.user, res.token)
      }
    } catch (err) {
      setError(apiErrorMessage(err, 'Login failed'))
    } finally {
      setLoading(false)
    }
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
    } finally {
      setLoading(false)
    }
  }

  const input =
    'w-full mb-3.5 px-3 py-2.5 rounded-lg bg-[#1c0e11] border border-vigno-line text-sm outline-none focus:border-vigno-accent'

  return (
    <div className="min-h-screen flex items-center justify-center p-5">
      <div className="bg-vigno-panel border border-vigno-line rounded-2xl p-8 w-[380px] shadow-2xl">
        <h2 className="text-xl font-bold mb-1">
          <span className="text-vigno-accent2">✈</span>Aero<span className="font-extrabold">Learn</span>
        </h2>
        <p className="text-vigno-muted text-sm mb-5">Aviation Training Platform · Sign in to continue</p>

        {error && (
          <div className="mb-4 text-sm bg-red-500/15 border border-red-500/40 text-red-200 rounded-lg px-3 py-2">{error}</div>
        )}

        {!challenge ? (
          <form onSubmit={submit}>
            <label className="text-xs text-vigno-muted block mb-1.5">Email</label>
            <input name="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className={input} />
            <label className="text-xs text-vigno-muted block mb-1.5">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className={input} />
            <div className="text-right -mt-1 mb-2">
              <Link to="/forgot-password" className="text-xs text-vigno-accent2 hover:underline">Forgot password?</Link>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-vigno-accent text-[#1a0d0f] font-extrabold py-3 rounded-xl hover:brightness-110 disabled:opacity-60">
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
            <p className="text-xs text-vigno-muted mt-4 text-center">
              New here? <Link to="/signup" className="text-vigno-accent2 hover:underline">Create an account</Link>
            </p>
            <p className="text-[11px] text-vigno-muted/70 mt-3 text-center">
              Demo: cadet@aerolearn.in / password · admin@vigno.in / Admin@12345
            </p>
          </form>
        ) : (
          <form onSubmit={submit2fa}>
            <p className="text-sm text-vigno-muted mb-3">
              {method === 'email'
                ? 'Enter the 6-digit code sent to your email.'
                : 'Enter the 6-digit code from your authenticator app (or a backup code).'}
            </p>
            <input autoFocus value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456"
              className={input + ' tracking-widest text-center text-lg'} />
            <button type="submit" disabled={loading}
              className="w-full bg-vigno-accent text-[#1a0d0f] font-extrabold py-3 rounded-xl hover:brightness-110 disabled:opacity-60">
              {loading ? 'Verifying…' : 'Verify'}
            </button>
            <button type="button" onClick={() => { setChallenge(null); setCode(''); setError('') }}
              className="w-full mt-2 text-xs text-vigno-muted hover:text-vigno-txt">← Back</button>
          </form>
        )}
      </div>
    </div>
  )
}
