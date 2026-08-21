import { useEffect, useState } from "react";

/**
 * A value that settles only after the caller stops changing it.
 *
 * The notes search sends `q` to the **server** — the API is what searches title
 * and content, since the client never holds the whole collection — so a
 * keystroke would otherwise be a request. The debounced value is what goes into
 * the query key, leaving the input itself immediate.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs);

    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return settled;
}
