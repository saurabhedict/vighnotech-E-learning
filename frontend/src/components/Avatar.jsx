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
    <div
      style={{ ...style, fontSize: Math.round(size * 0.42) }}
      className={'rounded-full bg-gradient-to-br from-vigno-bg3 to-vigno-card text-vigno-accent2 border border-vigno-line grid place-items-center font-bold select-none ' + className}
    >
      {initial}
    </div>
  )
}
