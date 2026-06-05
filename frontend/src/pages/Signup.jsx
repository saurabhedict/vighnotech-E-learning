import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { setCredentials } from '../store/authSlice'
import { authApi, apiErrorMessage } from '../api/authApi'

export default function Signup() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password.length < 8) return setError('Password must be at least 8 characters')
    setLoading(true)
    try {
      const { user, token } = await authApi.signup(form.email, form.password, form.name)
      dispatch(setCredentials({ user, token }))
      navigate('/app/PPL_Ground')
    } catch (err) {
      setError(apiErrorMessage(err, 'Signup failed'))
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
        <p className="text-vigno-muted text-sm mb-5">Create your account</p>

        {error && (
          <div className="mb-4 text-sm bg-red-500/15 border border-red-500/40 text-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <label className="text-xs text-vigno-muted block mb-1.5">Name</label>
        <input value={form.name} onChange={set('name')} autoComplete="name"
          className="w-full mb-3.5 px-3 py-2.5 rounded-lg bg-[#1c0e11] border border-vigno-line text-sm outline-none focus:border-vigno-accent" />

        <label className="text-xs text-vigno-muted block mb-1.5">Email</label>
        <input type="email" value={form.email} onChange={set('email')} required autoComplete="email"
          className="w-full mb-3.5 px-3 py-2.5 rounded-lg bg-[#1c0e11] border border-vigno-line text-sm outline-none focus:border-vigno-accent" />

        <label className="text-xs text-vigno-muted block mb-1.5">Password</label>
        <input type="password" value={form.password} onChange={set('password')} required autoComplete="new-password"
          className="w-full mb-1 px-3 py-2.5 rounded-lg bg-[#1c0e11] border border-vigno-line text-sm outline-none focus:border-vigno-accent" />
        <p className="text-[11px] text-vigno-muted/70 mb-1">At least 8 characters.</p>

        <button type="submit" disabled={loading}
          className="w-full mt-3 bg-vigno-accent text-[#1a0d0f] font-extrabold py-3 rounded-xl hover:brightness-110 disabled:opacity-60">
          {loading ? 'Creating…' : 'Create Account'}
        </button>

        <p className="text-xs text-vigno-muted mt-4 text-center">
          Already have an account? <Link to="/" className="text-vigno-accent2 hover:underline">Sign in</Link>
        </p>
      </form>
    </div>
  )
}
