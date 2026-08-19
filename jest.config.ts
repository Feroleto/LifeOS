import type { Config } from "jest";

/** Unit tests: no database, PrismaService is mocked. */
const config: Config = {
  rootDir: "src",
  testEnvironment: "node",
  // Decorators on DTOs run at import time and reach for Reflect.getMetadata.
  // Nest loads this itself when the app boots, which unit tests never do.
  setupFiles: ["reflect-metadata"],
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "<rootDir>/../tsconfig.json" }],
  },
  moduleFileExtensions: ["js", "json", "ts"],
  collectCoverageFrom: ["**/*.(t|j)s", "!**/generated/**"],
  coverageDirectory: "../coverage",
};

export default config;
