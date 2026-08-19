import { createElement } from "react";
import {
  Activity,
  Book,
  BookOpen,
  Briefcase,
  Calendar,
  ChartPie,
  Circle,
  FlameKindling,
  Heart,
  House,
  Leaf,
  Target,
  User,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/**
 * `Area.icon` is free text on the API side, so it is matched against a fixed
 * registry rather than indexed into lucide by name: a dynamic lookup would have
 * to import the whole icon set and defeat tree-shaking.
 *
 * Keys are lucide's kebab-case names. Two of the ones the design uses were
 * renamed in lucide v1 (`home` -> `house`, `pie-chart` -> `chart-pie`), so both
 * spellings are accepted — an area saved under the old name keeps its icon.
 *
 * Every name `prisma/seed.ts` writes has an entry here; without one a seeded
 * area renders the fallback dot.
 */
const AREA_ICONS: Record<string, LucideIcon> = {
  activity: Activity,
  book: Book,
  "book-open": BookOpen,
  briefcase: Briefcase,
  calendar: Calendar,
  "chart-pie": ChartPie,
  "pie-chart": ChartPie,
  "flame-kindling": FlameKindling,
  heart: Heart,
  house: House,
  home: House,
  leaf: Leaf,
  target: Target,
  user: User,
  users: Users,
  wallet: Wallet,
};

/** Falls back to a neutral dot, so an unknown or absent icon still lines up. */
export function areaIcon(icon: string | null | undefined): LucideIcon {
  return (icon && AREA_ICONS[icon.toLowerCase()]) || Circle;
}

/**
 * Rendering form of the lookup. `createElement` rather than `const Icon = ...;
 * <Icon />` because assigning a component from a call inside render is exactly
 * what the React compiler lint flags — the registry is module-level and the
 * result is stable, but only this shape says so.
 */
export function AreaIcon({
  icon,
  className,
}: {
  icon: string | null | undefined;
  className?: string;
}) {
  return createElement(areaIcon(icon), { className });
}
