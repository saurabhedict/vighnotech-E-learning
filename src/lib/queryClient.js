import { QueryClient } from '@tanstack/react-query'

// One shared QueryClient for the whole app.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
  },
})
