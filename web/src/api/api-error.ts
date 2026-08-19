/**
 * The API answers with three different error shapes:
 *
 *   - a Nest exception       -> { statusCode, message: string,   error: "Not Found" }
 *   - the ValidationPipe     -> { statusCode, message: string[], error: "Bad Request" }
 *   - PrismaExceptionFilter  -> { statusCode, message: string,   error: "P2002" }
 *
 * The last one puts the Prisma code where the others put the HTTP phrase, so
 * callers get one normalized error instead of three shapes to branch on.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly messages: string[];
  /** Only set when the body came from PrismaExceptionFilter. */
  readonly prismaCode: string | undefined;

  constructor(status: number, messages: string[], prismaCode?: string) {
    super(messages[0] ?? `Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.messages = messages;
    this.prismaCode = prismaCode;
  }
}

export async function toApiError(response: Response): Promise<ApiError> {
  let body: unknown = null;

  try {
    body = await response.json();
  } catch {
    // Empty or non-JSON body, e.g. a 204 that should not have failed, or a
    // proxy error page. The status alone still describes what happened.
  }

  const { message, error } = (body ?? {}) as { message?: unknown; error?: unknown };

  const messages = Array.isArray(message)
    ? message.map(String)
    : typeof message === "string"
      ? [message]
      : [`Request failed with status ${response.status}`];

  const prismaCode = typeof error === "string" && /^P\d{4}$/.test(error) ? error : undefined;

  return new ApiError(response.status, messages, prismaCode);
}
