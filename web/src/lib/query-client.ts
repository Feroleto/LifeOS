import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";

import { ApiError } from "@/api/api-error";
import { clearStoredUserId } from "@/identity/user-id-storage";

/**
 * A 401 means the stored id no longer identifies anyone. The QueryClient is
 * built outside React and cannot read the identity context, so it announces the
 * fact and IdentityProvider reacts — which also keeps this testable in jsdom,
 * unlike assigning to window.location.
 */
export const UNAUTHORIZED_EVENT = "lifeos:unauthorized";

function handleError(error: unknown): void {
  if (error instanceof ApiError && error.status === 401) {
    clearStoredUserId();
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({ onError: handleError }),
    mutationCache: new MutationCache({ onError: handleError }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // The API already rejected these on their merits; resending changes nothing.
          if (error instanceof ApiError && error.status < 500) {
            return false;
          }

          return failureCount < 2;
        },
      },
      mutations: { retry: false },
    },
  });
}

export const queryClient = createQueryClient();
