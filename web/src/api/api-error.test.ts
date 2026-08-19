import { describe, expect, it } from "vitest";

import { toApiError } from "./api-error";

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("toApiError", () => {
  it("normalizes a Nest exception", async () => {
    const error = await toApiError(
      jsonResponse({ statusCode: 404, message: "Goal not found", error: "Not Found" }, 404),
    );

    expect(error.status).toBe(404);
    expect(error.messages).toEqual(["Goal not found"]);
    expect(error.prismaCode).toBeUndefined();
  });

  it("normalizes the ValidationPipe, whose message is an array", async () => {
    const error = await toApiError(
      jsonResponse(
        {
          statusCode: 400,
          message: ["title must be longer than or equal to 1 characters", "property page should not exist"],
          error: "Bad Request",
        },
        400,
      ),
    );

    expect(error.status).toBe(400);
    expect(error.messages).toHaveLength(2);
    expect(error.prismaCode).toBeUndefined();
  });

  it("picks up the Prisma code, which the filter puts where the HTTP phrase normally goes", async () => {
    const error = await toApiError(
      jsonResponse(
        { statusCode: 409, message: "A record with this value already exists (name)", error: "P2002" },
        409,
      ),
    );

    expect(error.status).toBe(409);
    expect(error.prismaCode).toBe("P2002");
  });

  it("survives a body that is not JSON", async () => {
    const error = await toApiError(new Response("<html>502</html>", { status: 502 }));

    expect(error.status).toBe(502);
    expect(error.messages).toEqual(["Request failed with status 502"]);
  });
});
