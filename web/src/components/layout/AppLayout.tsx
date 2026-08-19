import { NavLink, Outlet } from "react-router";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIdentity } from "@/identity/identity-context";
import { useMe } from "@/identity/user.queries";

function navLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
    isActive ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground",
  );
}

export function AppLayout() {
  const me = useMe();
  const { signOut } = useIdentity();

  return (
    <div className="min-h-svh">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-6">
            <span className="font-semibold">Life OS</span>
            {/*
              Primary navigation is by Core concept. Areas are labels that cut
              across goals, so they belong in the utility bar rather than here.
            */}
            <nav className="flex gap-1">
              <NavLink to="/goals" className={navLinkClass}>
                Goals
              </NavLink>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <NavLink to="/areas" className={navLinkClass}>
              Areas
            </NavLink>
            {me.data ? (
              <span className="text-muted-foreground text-sm">{me.data.name}</span>
            ) : null}
            <Button variant="outline" size="sm" onClick={signOut}>
              Change user
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
