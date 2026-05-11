/**
 * Shared React Query client.
 *
 * App shell (whoever wires `App.tsx` — Navigation Setup agent or app-shell
 * author) MUST wrap the navigation tree in:
 *
 *   <QueryClientProvider client={queryClient}>
 *     <NavigationContainer>...</NavigationContainer>
 *   </QueryClientProvider>
 *
 * Defaults below are tuned for a mobile app talking to stub data:
 *  - `staleTime`: 30s — stubs are deterministic, refetching on every focus
 *    is wasteful and would overrun the simulated latency.
 *  - `gcTime`: 5min — keep cached data warm across screen pops.
 *  - `retry`: 1 — stubs throw `ApiError` for deterministic test cases; one
 *    automatic retry is a sane balance for transient SERVER_ERROR rolls.
 *  - `refetchOnWindowFocus: false` — the React Native equivalent
 *    (AppState 'active' transitions) is opt-in per query, not global.
 */
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
