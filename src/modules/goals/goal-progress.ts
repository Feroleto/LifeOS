/** Where `currentValue` came from — a stored field, or a sum over metrics. */
export type ProgressSource = "MANUAL" | "METRIC";

export interface GoalProgress {
  goalId: string;
  targetValue: number | null;
  currentValue: number | null;
  /**
   * `currentValue / targetValue` as a percentage, rounded to one decimal.
   * Not capped: exceeding the target reports over 100.
   */
  percentage: number | null;
  source: ProgressSource;
}

/**
 * Foundation section 8: progress is a calculation over a goal and current data,
 * not a stored result and not a polymorphic definition.
 *
 * `null` means the question does not apply rather than "zero":
 * - no target at all is a qualitative goal, which has no percentage;
 * - a target of 0 is a real target (`@Min(0)` allows it), but a ratio to zero
 *   has no value, and treating it as "achieved" would invent a direction the
 *   model does not express.
 */
export function toPercentage(
  targetValue: number | null,
  currentValue: number | null,
): number | null {
  if (targetValue === null || targetValue === 0 || currentValue === null) {
    return null;
  }

  return Math.round((currentValue / targetValue) * 1000) / 10;
}
