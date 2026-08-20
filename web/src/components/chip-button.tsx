import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * The pill the design uses wherever a choice is made inline — area filters,
 * area tags on the goal form, the status picker, the cancelled toggle.
 *
 * `area` reads `--area` / `--area-tint` off the element's own style, so the
 * caller supplies the color through `areaColorVars` and the classes stay static.
 * `solid` is the dark selection the design gives "All areas" and the chosen
 * status; `muted` is the quieter one it gives a toggle that is merely on.
 */
const VARIANTS = {
  area: "border-[var(--area)] bg-[var(--area-tint)] text-[var(--area)]",
  solid: "border-primary bg-primary text-primary-foreground",
  muted: "border-border bg-muted text-foreground",
} as const;

export function ChipButton({
  selected = false,
  variant = "area",
  className,
  ...props
}: ComponentProps<"button"> & {
  selected?: boolean;
  variant?: keyof typeof VARIANTS;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "flex h-[34px] shrink-0 items-center gap-2 rounded-xl border px-3.5 text-[13px] whitespace-nowrap transition-colors",
        selected
          ? cn("font-semibold", VARIANTS[variant])
          : "border-border bg-card text-muted-foreground hover:text-foreground font-medium",
        className,
      )}
      {...props}
    />
  );
}

/** The color dot an area chip carries, in that area's accent. */
export function ChipDot() {
  return <span aria-hidden className="size-2 shrink-0 rounded-full bg-[var(--area)]" />;
}
