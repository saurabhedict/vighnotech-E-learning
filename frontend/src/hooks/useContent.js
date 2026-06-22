import { useQuery } from '@tanstack/react-query'
import { fetchClasses, fetchClassTree, fetchModule, fetchContent } from '../api/mockApi'

export const useClasses = () =>
  useQuery({ queryKey: ['classes'], queryFn: fetchClasses })

// Content trees + items are effectively immutable within a session, so keep them
// fresh for 5 min — avoids re-fetching the same tree/item on every back-navigation
// (the global default is 30s; see src/lib/queryClient.js).
const CONTENT_STALE = 5 * 60 * 1000

export const useClassTree = (className) =>
  useQuery({ queryKey: ['classTree', className], queryFn: () => fetchClassTree(className), enabled: !!className, staleTime: CONTENT_STALE })

export const useModule = (className, moduleId) =>
  useQuery({ queryKey: ['module', className, moduleId], queryFn: () => fetchModule(className, moduleId), staleTime: CONTENT_STALE })

export const useContentItem = (contentId) =>
  useQuery({ queryKey: ['content', contentId], queryFn: () => fetchContent(contentId), enabled: !!contentId, staleTime: CONTENT_STALE })
