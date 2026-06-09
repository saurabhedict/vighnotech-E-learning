// Shows the user's photo, or their initial as a fallback.
export default function Avatar({ user, size = 40, className = '' }) {
  const initial = (user?.name || user?.email || '?').trim().charAt(0).toUpperCase()
  const style = { width: size, height: size }
  if (user?.avatar) {
    return (
      <img src={user.avatar} alt="" style={style}
        className={'rounded-full object-cover border border-vigno-line ' + className} />
    )
  }
  return (
    <div style={style}
      className={'rounded-full bg-vigno-accent/25 text-vigno-accent2 grid place-items-center font-bold select-none ' + className}>
      {initial}
    </div>
  )
}
