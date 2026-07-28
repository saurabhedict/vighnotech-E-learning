import { Link } from 'react-router-dom'
import { useSiteSettings } from '../hooks/useSiteSettings'
import { safeHref } from '../lib/safeUrl'

// Optional top strip controlled from Site Settings → Header.
export default function AnnouncementBar() {
  const { data } = useSiteSettings()
  const a = data?.header?.announcement
  if (!a?.enabled || !a.text) return null
  const cls = 'block w-full text-center text-xs font-semibold py-1.5 px-4 bg-vigno-accent text-vigno-accent-txt'
  if (a.link) {
    return a.link.startsWith('/') && !a.link.startsWith('//')
      ? <Link to={a.link} className={cls + ' hover:brightness-95'}>{a.text}</Link>
      : <a href={safeHref(a.link)} target="_blank" rel="noreferrer" className={cls + ' hover:brightness-95'}>{a.text}</a>
  }
  return <div className={cls}>{a.text}</div>
}
