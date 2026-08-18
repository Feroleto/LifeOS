import { config } from "dotenv";

// override: the development .env must not leak into the tests.
config({ path: ".env.test", override: true, quiet: true });
