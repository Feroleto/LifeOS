import { CircleCheck, House, Leaf, Settings2 } from "lucide-react";
import { NavLink, useLocation, useSearchParams } from "react-router";

import { Button } from "@/components/ui/button";
import { areaIcon } from "@/features/areas/area-icon";
import { useAreas } from "@/features/areas/areas.queries";
import { useIdentity } from "@/identity/identity-context";
import { useMe } from "@/identity/user.queries";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

function NavItem({
  to,
  icon: Icon,
  label,
  isActive,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
  isActive: boolean;
}) {
  return (
    <NavLink
      to={to}
      className={cn(
        "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition-colors",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
          : "text-muted-foreground hover:text-foreground font-medium",
      )}
    >
      <Icon className="size-[18px] shrink-0" />
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

export function Sidebar() {
  const me = useMe();
  const areas = useAreas();
  const { signOut } = useIdentity();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();

  // Each area now has a page of its own, so NavLink's own isActive would do —
  // except the goals board is still reachable filtered by an area, and that
  // view belongs to the same item. The query string is what says so, and
  // isActive ignores it.
  const activeAreaId =
    pathname === "/goals" ? searchParams.get("areaId") : pathname.replace("/areas/", "");

  return (
    <aside className="bg-sidebar border-sidebar-border hidden w-[260px] shrink-0 flex-col justify-between border-r p-8 md:flex">
      <div className="flex flex-col gap-10">
        <div className="flex items-center gap-2.5">
          <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-[10px]">
            <Leaf className="size-4" />
          </span>
          <span className="font-heading text-2xl">Life OS</span>
        </div>

        <nav className="flex flex-col gap-1.5">
          <NavItem to="/" icon={House} label="Overview" isActive={pathname === "/"} />

          {/*
            The design's navigation is a list of life areas rather than of Core
            concepts, so each item opens that area's own page.
          */}
          {(areas.data ?? []).map((area) => (
            <NavItem
              key={area.id}
              to={`/areas/${area.id}`}
              icon={areaIcon(area.icon)}
              label={area.name}
              isActive={activeAreaId === area.id}
            />
          ))}

          {/*
            Habits sit below the areas rather than among them: `Habit` has no
            relation to `Area`, so the item is a Core concept, not a filter.
          */}
          <NavItem
            to="/habits"
            icon={CircleCheck}
            label="Habits"
            isActive={pathname === "/habits"}
          />

          <NavItem
            to="/areas"
            icon={Settings2}
            label="Manage areas"
            isActive={pathname === "/areas"}
          />
        </nav>
      </div>

      <div className="flex flex-col gap-3">
        {me.data ? (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{me.data.name}</p>
            <p className="text-subtle text-[11px]">
              Member since {new Date(me.data.createdAt).getFullYear()}
            </p>
          </div>
        ) : null}
        <Button variant="outline" size="sm" onClick={signOut}>
          Change user
        </Button>
      </div>
    </aside>
  );
}
