import { useQuery } from '@tanstack/react-query'
import { settingsApi } from '../api/settingsApi'

// Shared site settings (branding + footer). One cached query for the whole app
// so the Navbar and Footer stay in sync after an admin edit.
export const SITE_SETTINGS_KEY = ['site', 'settings']

export function useSiteSettings() {
  return useQuery({
    queryKey: SITE_SETTINGS_KEY,
    queryFn: settingsApi.get,
    staleTime: 5 * 60 * 1000,
  })
}
