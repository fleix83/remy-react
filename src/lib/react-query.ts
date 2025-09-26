import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 3 * 60 * 1000, // 3 minutes - optimized for forum content
      gcTime: 15 * 60 * 1000, // 15 minutes - longer garbage collection
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error instanceof Error && 'status' in error && (error as any).status >= 400 && (error as any).status < 500) {
          return false
        }
        return failureCount < 2
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
      // Enable background refetching to keep data fresh
      refetchInterval: 10 * 60 * 1000, // 10 minutes background refresh for active queries
      refetchIntervalInBackground: false,
      // Network mode for better offline support
      networkMode: 'online'
    },
    mutations: {
      retry: 1,
      networkMode: 'online'
    }
  }
})