import { HttpResponse, http as msw } from "msw";
import { describe, expect, it } from "vitest";

import { setStoredUserId } from "@/identity/user-id-storage";
import { server } from "@/test/msw-server";
import { http } from "./http";

describe("http client", () => {
  it("sends the stored user id, since the API has no other way to know who is asking", async () => {
    setStoredUserId("29967d6a-f3c1-4d8d-9b52-f1c79a3bd228");

    let received: string | null = null;

    server.use(
      msw.get("/api/areas", ({ request }) => {
        received = request.headers.get("x-user-id");
        return HttpResponse.json([]);
      }),
    );

    await http.get("/areas");

    expect(received).toBe("29967d6a-f3c1-4d8d-9b52-f1c79a3bd228");
  });

  it("omits the header on public calls", async () => {
    setStoredUserId("29967d6a-f3c1-4d8d-9b52-f1c79a3bd228");

    let received: string | null = "not asked";

    server.use(
      msw.post("/api/users", ({ request }) => {
        received = request.headers.get("x-user-id");
        return HttpResponse.json({}, { status: 201 });
      }),
    );

    await http.post("/users", {}, true);

    expect(received).toBeNull();
  });

  it("drops empty query params, which forbidNonWhitelisted would answer with a 400", async () => {
    const urls: string[] = [];

    server.use(
      msw.get("/api/goals", ({ request }) => {
        urls.push(request.url);
        return HttpResponse.json([]);
      }),
    );

    await http.get("/goals", { status: "ACTIVE", areaId: undefined });
    await http.get("/goals", { status: undefined, areaId: "" });

    expect(new URL(urls[0] ?? "").search).toBe("?status=ACTIVE");
    expect(new URL(urls[1] ?? "").search).toBe("");
  });

  it("returns nothing for a 204 instead of trying to parse a body", async () => {
    server.use(msw.delete("/api/goals/:id", () => new HttpResponse(null, { status: 204 })));

    await expect(http.delete("/goals/abc")).resolves.toBeUndefined();
  });
});
