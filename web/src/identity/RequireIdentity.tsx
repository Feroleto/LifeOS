import { Navigate, Outlet } from "react-router";

import { ErrorState, LoadingState } from "@/components/layout/states";
import { Button } from "@/components/ui/button";
import { useIdentity } from "./identity-context";
import { useMe } from "./user.queries";

/**
 * The stored id is only a claim until the API confirms it, so every session
 * starts with GET /users/me. A 401 is handled globally: it clears the storage
 * and empties the context, which lands here as "no user id".
 */
export function RequireIdentity() {
  const { userId, signOut } = useIdentity();
  const { isPending, isError, error, refetch } = useMe();

  if (!userId) {
    return <Navigate to="/setup" replace />;
  }

  if (isPending) {
    return (
      <div className="mx-auto max-w-2xl p-10">
        <LoadingState rows={4} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-10">
        <ErrorState error={error} onRetry={() => void refetch()} />
        <Button variant="outline" onClick={signOut}>
          Use a different id
        </Button>
      </div>
    );
  }

  return <Outlet />;
}
