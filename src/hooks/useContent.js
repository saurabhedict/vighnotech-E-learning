import { useQuery } from '@tanstack/react-query'
import { fetchClasses, fetchClassTree, fetchModule, fetchContent } from '../api/mockApi'

export const useClasses = () =>
  useQuery({ queryKey: ['classes'], queryFn: fetchClasses })

export const useClassTree = (className) =>
  useQuery({ queryKey: ['classTree', className], queryFn: () => fetchClassTree(className), enabled: !!className })

export const useModule = (className, moduleId) =>
  useQuery({ queryKey: ['module', className, moduleId], queryFn: () => fetchModule(className, moduleId) })

export const useContentItem = (contentId) =>
  useQuery({ queryKey: ['content', contentId], queryFn: () => fetchContent(contentId), enabled: !!contentId })
