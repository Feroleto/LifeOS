import type { CSSProperties } from "react";

/**
 * The design pairs a dark accent with a light tint per area, but the API stores
 * a single `Area.color`, picked freely through a color input. Both are mixed
 * from it in CSS rather than adding a second column, and travel as custom
 * properties so the classes that consume them stay static.
 *
 * The accent is darkened rather than used raw: stored colors are typically mid
 * tones (#22c55e, #eab308) that fail as small text on white, while the design's
 * accents are dark (#2b5e3c, #7e5b18). Mixing toward black in oklab keeps the
 * hue and lands in that same family.
 *
 * No color — an area saved without one, or a goal belonging to no area at all —
 * falls back to the neutral tokens, so the same two variables always resolve.
 */
export function areaColorVars(color: string | null | undefined): CSSProperties {
  if (!color) {
    return { "--area": "var(--muted-foreground)", "--area-tint": "var(--muted)" } as CSSProperties;
  }

  return {
    "--area": `color-mix(in oklab, ${color} 62%, black)`,
    "--area-tint": `color-mix(in oklab, ${color} 12%, white)`,
  } as CSSProperties;
}
