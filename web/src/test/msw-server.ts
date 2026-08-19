import { setupServer } from "msw/node";

/**
 * Handlers are registered per test with `server.use`. What matters in these
 * tests is the shape of the outgoing request — the header, the omitted query
 * params, `areaIds: []` — which a hand-rolled fetch mock could not assert.
 */
export const server = setupServer();
