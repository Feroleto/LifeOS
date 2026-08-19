import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/api/query-keys";
import { useIdentity } from "./identity-context";
import { getMe } from "./user.api";

export function useMe() {
  const { userId } = useIdentity();

  return useQuery({
    queryKey: queryKeys.me,
    queryFn: getMe,
    enabled: Boolean(userId),
    retry: false,
    staleTime: Infinity,
  });
}
