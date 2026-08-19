import { ApiError } from "@/api/api-error";

/** Flattens anything thrown by the API layer into displayable lines. */
export function errorMessages(error: unknown): string[] {
  if (error instanceof ApiError) {
    return error.messages;
  }

  return [error instanceof Error ? error.message : "Something went wrong"];
}
