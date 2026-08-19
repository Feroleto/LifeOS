import { createContext, useContext } from "react";

export type IdentityContextValue = {
  userId: string | null;
  signIn: (userId: string) => void;
  signOut: () => void;
};

export const IdentityContext = createContext<IdentityContextValue | null>(null);

export function useIdentity(): IdentityContextValue {
  const value = useContext(IdentityContext);

  if (!value) {
    throw new Error("useIdentity must be used inside an IdentityProvider");
  }

  return value;
}
