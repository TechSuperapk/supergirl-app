/**
 * React Query client — used for cloud fetch/backup/restore mutations.
 * Wrap the app once: <QueryClientProvider client={queryClient}>...</QueryClientProvider>
 */
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});
