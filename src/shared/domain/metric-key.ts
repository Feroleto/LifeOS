/**
 * `METRIC.key` is the grouping dimension of every series, so a value recorded as
 * `sleepHours` would silently become a second series next to `sleep_hours`. The
 * constraint lives here because two modules depend on it: metrics validate the
 * key they store, and goals validate the key they point at — a goal allowed to
 * name a key the metrics endpoint rejects could never be satisfied.
 */
export const METRIC_KEY_PATTERN = /^[a-z][a-z0-9_]*$/;

export const METRIC_KEY_MAX_LENGTH = 60;

export const METRIC_KEY_MESSAGE = "must be snake_case, e.g. sleep_hours";
