import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http as msw } from "msw";
import { describe, expect, it } from "vitest";

import { areasHandler, makeArea } from "@/test/handlers";
import { server } from "@/test/msw-server";
import { renderWithProviders } from "@/test/render";
import { AreasPage } from "./AreasPage";

const HEALTH_ID = "8f14e45f-ce9a-4f2b-8c3d-1a2b3c4d5e6f";

describe("AreasPage", () => {
  it("lists what the API returns", async () => {
    server.use(areasHandler([makeArea({ id: HEALTH_ID, name: "Health", color: "#22c55e" })]));

    renderWithProviders(<AreasPage />);

    expect(await screen.findByText("Health")).toBeInTheDocument();
  });

  it("turns a duplicate name into an error on the name field", async () => {
    server.use(
      areasHandler([]),
      // What PrismaExceptionFilter answers for P2002: note the message names
      // the constraint columns, not the form field.
      msw.post("/api/areas", () =>
        HttpResponse.json(
          {
            statusCode: 409,
            message: "A record with this value already exists (userId, name)",
            error: "P2002",
          },
          { status: 409 },
        ),
      ),
    );

    const user = userEvent.setup();

    renderWithProviders(<AreasPage />);

    await user.click(await screen.findByRole("button", { name: "New area" }));
    await user.type(await screen.findByLabelText("Name"), "Health");
    await user.click(screen.getByRole("button", { name: "Create area" }));

    expect(await screen.findByText("You already have an area with this name")).toBeInTheDocument();
  });
});
