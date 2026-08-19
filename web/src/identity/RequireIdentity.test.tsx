import { screen } from "@testing-library/react";
import { HttpResponse, http as msw } from "msw";
import { Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";

import { meHandler, USER_ID } from "@/test/handlers";
import { server } from "@/test/msw-server";
import { renderWithProviders } from "@/test/render";
import { RequireIdentity } from "./RequireIdentity";
import { getStoredUserId, setStoredUserId } from "./user-id-storage";

function Tree() {
  return (
    <Routes>
      <Route path="/setup" element={<p>setup screen</p>} />
      <Route element={<RequireIdentity />}>
        <Route path="/goals" element={<p>goals screen</p>} />
      </Route>
    </Routes>
  );
}

describe("RequireIdentity", () => {
  it("sends someone without a stored id to the setup screen", async () => {
    renderWithProviders(<Tree />, { route: "/goals" });

    expect(await screen.findByText("setup screen")).toBeInTheDocument();
  });

  it("lets a confirmed id through", async () => {
    setStoredUserId(USER_ID);
    server.use(meHandler());

    renderWithProviders(<Tree />, { route: "/goals" });

    expect(await screen.findByText("goals screen")).toBeInTheDocument();
  });

  it("clears a stored id the API rejects and falls back to setup", async () => {
    setStoredUserId(USER_ID);
    server.use(
      msw.get("/api/users/me", () =>
        HttpResponse.json({ statusCode: 401, message: "User not found", error: "Unauthorized" }, { status: 401 }),
      ),
    );

    renderWithProviders(<Tree />, { route: "/goals" });

    expect(await screen.findByText("setup screen")).toBeInTheDocument();
    expect(getStoredUserId()).toBeNull();
  });
});
