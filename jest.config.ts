import type { Config } from "jest";

/** Unit tests: no database, PrismaService is mocked. */
const config: Config = {
  rootDir: "src",
  testEnvironment: "node",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "<rootDir>/../tsconfig.json" }],
  },
  moduleFileExtensions: ["js", "json", "ts"],
  collectCoverageFrom: ["**/*.(t|j)s", "!**/generated/**"],
  coverageDirectory: "../coverage",
};

export default config;
