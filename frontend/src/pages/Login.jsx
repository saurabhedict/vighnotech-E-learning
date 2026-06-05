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

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { user, token } = await authApi.login(email, password)
      dispatch(setCredentials({ user, token }))
      navigate(user.role === 'admin' ? '/app/admin' : '/app/PPL_Ground')
    } catch (err) {
      setError(apiErrorMessage(err, 'Login failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5">
      <form onSubmit={submit} className="bg-vigno-panel border border-vigno-line rounded-2xl p-8 w-[380px] shadow-2xl">
        <h2 className="text-xl font-bold mb-1">
          <span className="text-vigno-accent2">✈</span>Aero<span className="font-extrabold">Learn</span>
        </h2>
        <p className="text-vigno-muted text-sm mb-5">Aviation Training Platform · Sign in to continue</p>

        {error && (
          <div className="mb-4 text-sm bg-red-500/15 border border-red-500/40 text-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <label className="text-xs text-vigno-muted block mb-1.5">Email</label>
        <input name="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email"
          className="w-full mb-3.5 px-3 py-2.5 rounded-lg bg-[#1c0e11] border border-vigno-line text-sm outline-none focus:border-vigno-accent" />

        <label className="text-xs text-vigno-muted block mb-1.5">Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password"
          className="w-full mb-1 px-3 py-2.5 rounded-lg bg-[#1c0e11] border border-vigno-line text-sm outline-none focus:border-vigno-accent" />

        <button type="submit" disabled={loading}
          className="w-full mt-3 bg-vigno-accent text-[#1a0d0f] font-extrabold py-3 rounded-xl hover:brightness-110 disabled:opacity-60">
          {loading ? 'Signing in…' : 'Sign In'}
        </button>

        <p className="text-xs text-vigno-muted mt-4 text-center">
          New here? <Link to="/signup" className="text-vigno-accent2 hover:underline">Create an account</Link>
        </p>
        <p className="text-[11px] text-vigno-muted/70 mt-3 text-center">
          Demo: cadet@aerolearn.in / password &nbsp;·&nbsp; admin@vigno.in / Admin@12345
        </p>
      </form>
    </div>
  )
}
