import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http as msw } from "msw";
import { describe, expect, it } from "vitest";

import {
  USER_ID,
  areasHandler,
  createNoteHandler,
  deleteNoteHandler,
  makeArea,
  makeNote,
  meHandler,
  notesHandler,
} from "@/test/handlers";
import { server } from "@/test/msw-server";
import { renderWithProviders } from "@/test/render";
import { NotesPage } from "./NotesPage";

const HEALTH_ID = "8f14e45f-ce9a-4f2b-8c3d-1a2b3c4d5e6f";
const HEALTH = makeArea({ id: HEALTH_ID, name: "Health", color: "#22c55e" });

const NOTES = [
  makeNote({
    id: "n1",
    title: "Blood test",
    content: "Ferritin came back low",
    areaId: HEALTH_ID,
  }),
  makeNote({ id: "n2", title: "Book idea", content: "A novel about a lighthouse" }),
];

function renderNotes() {
  window.localStorage.setItem("lifeos.userId", USER_ID);

  return renderWithProviders(<NotesPage />, { route: "/notes" });
}

describe("NotesPage", () => {
  it("lists every note, including the ones filed under no area", async () => {
    server.use(meHandler(), areasHandler([HEALTH]), notesHandler(NOTES));

    renderNotes();

    expect(await screen.findByText("Blood test")).toBeInTheDocument();
    // The note with areaId null is the case the route exists for — an area
    // page would never show it.
    expect(screen.getByText("Book idea")).toBeInTheDocument();
  });

  it("sends the search to the server, which is what can match on content", async () => {
    const user = userEvent.setup();
    const urls: string[] = [];

    server.use(
      meHandler(),
      areasHandler([HEALTH]),
      msw.get("/api/notes", ({ request }) => {
        urls.push(request.url);

        const q = new URL(request.url).searchParams.get("q")?.toLowerCase();
        const data = NOTES.filter(
          (note) => q === undefined || note.content.toLowerCase().includes(q),
        );

        return HttpResponse.json(data);
      }),
    );

    renderNotes();

    await screen.findByText("Blood test");
    // "lighthouse" appears only in a note's content, which the client never
    // reads to filter — so a narrowed list proves the term reached the API.
    await user.type(screen.getByLabelText("Search notes"), "lighthouse");

    await waitFor(() => expect(screen.queryByText("Blood test")).not.toBeInTheDocument());
    // Still on screen throughout, never replaced by a skeleton: the previous
    // answer is kept while the narrower one loads.
    expect(screen.getByText("Book idea")).toBeInTheDocument();
    expect(urls.at(-1)).toContain("q=lighthouse");
  });

  it("filters by area through the request, not in the browser", async () => {
    const user = userEvent.setup();

    server.use(meHandler(), areasHandler([HEALTH]), notesHandler(NOTES));

    renderNotes();

    await screen.findByText("Book idea");
    await user.click(screen.getByRole("button", { name: "Health" }));

    await waitFor(() => expect(screen.queryByText("Book idea")).not.toBeInTheDocument());
    expect(screen.getByText("Blood test")).toBeInTheDocument();
  });

  it("creates a note, dropping the keys it has nothing to put in", async () => {
    const user = userEvent.setup();
    const bodies: Record<string, unknown>[] = [];

    server.use(
      meHandler(),
      areasHandler([HEALTH]),
      notesHandler([]),
      createNoteHandler((body) => bodies.push(body)),
    );

    renderNotes();

    await user.click(await screen.findByRole("button", { name: /New note/ }));
    await user.type(await screen.findByLabelText("Content"), "Ferritin came back low");
    await user.click(screen.getByRole("button", { name: "Create note" }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    // No title and no area were filled in, and "" would fail both validators.
    expect(bodies[0]).toEqual({ content: "Ferritin came back low" });
  });

  it("deletes a note only after the confirmation", async () => {
    const user = userEvent.setup();
    const deleted: string[] = [];

    server.use(
      meHandler(),
      areasHandler([HEALTH]),
      notesHandler(NOTES),
      deleteNoteHandler((id) => deleted.push(id)),
    );

    renderNotes();

    await user.click(await screen.findByRole("button", { name: "Delete Blood test" }));
    expect(deleted).toEqual([]);

    await user.click(await screen.findByRole("button", { name: "Delete" }));

    await waitFor(() => expect(deleted).toEqual(["n1"]));
  });
});
