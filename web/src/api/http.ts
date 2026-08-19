import { getStoredUserId } from "@/identity/user-id-storage";
import { toApiError } from "./api-error";

/**
 * Always relative. The API enables no CORS, so the Vite dev server proxies
 * /api to it and a deployed build is served from the same origin.
 */
const API_BASE = "/api";

export type QueryParams = Record<string, string | undefined>;

type RequestOptions = {
  method?: string;
  body?: unknown;
  params?: QueryParams;
  /** Skips the X-User-Id header. Only POST /users is reachable without it. */
  isPublic?: boolean;
};

function buildUrl(path: string, params?: QueryParams): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params ?? {})) {
    // An empty value is not "no filter": the query DTOs run under
    // forbidNonWhitelisted, so `?status=` is a 400 rather than a full list.
    if (value !== undefined && value !== "") {
      search.set(key, value);
    }
  }

  const query = search.toString();
  const relative = query ? `${API_BASE}${path}?${query}` : `${API_BASE}${path}`;

  // Resolved against the current origin rather than left relative: the browser
  // would do exactly this, and it keeps fetch usable under jsdom, whose fetch
  // comes from Node and rejects relative URLs.
  return new URL(relative, window.location.origin).toString();
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (!options.isPublic) {
    const userId = getStoredUserId();

    if (userId) {
      headers["x-user-id"] = userId;
    }
  }

  const response = await fetch(buildUrl(path, options.params), {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) {
    throw await toApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const http = {
  get<T>(path: string, params?: QueryParams): Promise<T> {
    return request<T>(path, { params });
  },
  post<T>(path: string, body: unknown, isPublic = false): Promise<T> {
    return request<T>(path, { method: "POST", body, isPublic });
  },
  patch<T>(path: string, body: unknown): Promise<T> {
    return request<T>(path, { method: "PATCH", body });
  },
  delete(path: string): Promise<void> {
    return request<void>(path, { method: "DELETE" });
  },
};
