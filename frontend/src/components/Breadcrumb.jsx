import { useSiteSettings } from '../hooks/useSiteSettings'

// Page breadcrumb: "<Brand> › <trail>". Brand follows Site Settings.
export default function Breadcrumb({ trail }) {
  const { data } = useSiteSettings()
  const brand = data?.brand?.name || 'Aerolearn'
  return <div className="text-sm text-vigno-muted mb-1">{brand} › {trail}</div>
}
