import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { UNAUTHORIZED_EVENT } from "@/lib/query-client";
import { IdentityContext } from "./identity-context";
import { clearStoredUserId, getStoredUserId, setStoredUserId } from "./user-id-storage";

export function IdentityProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(() => getStoredUserId());

  const signIn = useCallback(
    (id: string) => {
      setStoredUserId(id);
      setUserId(id);
      // Anything cached belonged to whoever was signed in before.
      queryClient.clear();
    },
    [queryClient],
  );

  const signOut = useCallback(() => {
    clearStoredUserId();
    setUserId(null);
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    // The query client already cleared the storage; this only syncs React.
    const onUnauthorized = () => setUserId(null);

    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);

    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const value = useMemo(() => ({ userId, signIn, signOut }), [userId, signIn, signOut]);

  return <IdentityContext.Provider value={value}>{children}</IdentityContext.Provider>;
}
