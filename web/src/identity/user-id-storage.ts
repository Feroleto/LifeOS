/**
 * The API has no authentication yet: every request identifies its user through
 * the X-User-Id header. Keeping the key behind these three functions means the
 * swap to real auth touches one file.
 */
const STORAGE_KEY = "lifeos.userId";

export function getStoredUserId(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredUserId(userId: string): void {
  window.localStorage.setItem(STORAGE_KEY, userId);
}

export function clearStoredUserId(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}
