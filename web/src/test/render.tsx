import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";

import { IdentityProvider } from "@/identity/IdentityProvider";
import { createQueryClient } from "@/lib/query-client";

/** The real client, so the global 401 handling is exercised rather than faked. */
export function renderWithProviders(ui: ReactElement, { route = "/" }: { route?: string } = {}) {
  const queryClient = createQueryClient();

  queryClient.setDefaultOptions({
    queries: { retry: false, staleTime: 0 },
    mutations: { retry: false },
  });

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>
          <IdentityProvider>{ui}</IdentityProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  };
}
