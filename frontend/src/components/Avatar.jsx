// Shows the user's photo (or their initial), with an optional blue verified tick.
export default function Avatar({ user, size = 40, verified = false, className = '' }) {
  const initial = (user?.name || user?.email || '?').trim().charAt(0).toUpperCase()
  const style = { width: size, height: size }
  const tickSize = Math.max(14, Math.round(size * 0.32))

  const inner = user?.avatar ? (
    <img src={user.avatar} alt="" style={style} className={'rounded-full object-cover border border-vigno-line ' + className} />
  ) : (
    <div
      style={{ ...style, fontSize: Math.round(size * 0.42) }}
      className={'rounded-full bg-gradient-to-br from-vigno-bg3 to-vigno-card text-vigno-accent2 border border-vigno-line grid place-items-center font-bold select-none ' + className}
    >
      {initial}
    </div>
  )

  if (!verified) return inner
  return (
    <span className="relative inline-block">
      {inner}
      <span
        title="Verified"
        style={{ width: tickSize, height: tickSize }}
        className="absolute -bottom-0.5 -right-0.5 rounded-full bg-[#1da1f2] text-white grid place-items-center ring-2 ring-vigno-panel shadow"
      >
        <svg viewBox="0 0 24 24" width={tickSize * 0.66} height={tickSize * 0.66} fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
    </span>
  )
}
