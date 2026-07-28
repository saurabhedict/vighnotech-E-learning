import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <h1 className="text-4xl font-extrabold">404</h1>
      <p className="text-vigno-muted">Page not found.</p>
      <Link to="/" className="bg-vigno-accent text-vigno-accent-txt font-bold px-5 py-2.5 rounded-xl">Back to Login</Link>
    </div>
  )
}
