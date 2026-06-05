import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { login } from '../store/authSlice'

export default function Login() {
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const submit = (e) => {
    e.preventDefault()
    const email = e.target.email.value || 'cadet@aerolearn.in'
    // store login in Redux (demo token), then enter the app
    dispatch(login({ email, role: 'student', token: 'demo-token' }))
    navigate('/app/PPL_Ground')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5">
      <form onSubmit={submit} className="bg-vigno-panel border border-vigno-line rounded-2xl p-8 w-[380px] shadow-2xl">
        <h2 className="text-xl font-bold mb-1">
          <span className="text-vigno-accent2">✈</span>Aero<span className="font-extrabold">Learn</span>
        </h2>
        <p className="text-vigno-muted text-sm mb-5">Aviation Training Platform · Sign in to continue</p>

        <label className="text-xs text-vigno-muted block mb-1.5">Email</label>
        <input name="email" defaultValue="cadet@aerolearn.in"
          className="w-full mb-3.5 px-3 py-2.5 rounded-lg bg-[#1c0e11] border border-vigno-line text-sm outline-none focus:border-vigno-accent" />

        <label className="text-xs text-vigno-muted block mb-1.5">Password</label>
        <input type="password" defaultValue="password"
          className="w-full mb-1 px-3 py-2.5 rounded-lg bg-[#1c0e11] border border-vigno-line text-sm outline-none focus:border-vigno-accent" />

        <button type="submit"
          className="w-full mt-3 bg-vigno-accent text-[#1a0d0f] font-extrabold py-3 rounded-xl hover:brightness-110">
          Sign In
        </button>
      </form>
    </div>
  )
}
