import type { UserConfig } from "@commitlint/types";

/**
 * Conventional Commits contract for this repository.
 *
 * The type list is kept explicit (instead of relying on the defaults of
 * @commitlint/config-conventional) so it stays in sync with the prompts of
 * cz-conventional-changelog, which is what `npm run commit` drives.
 */
const config: UserConfig = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat", // a new user-facing capability
        "fix", // a bug fix
        "docs", // documentation only
        "style", // formatting only, no behaviour change
        "refactor", // code change that neither fixes a bug nor adds a feature
        "perf", // performance improvement
        "test", // adding or fixing tests
        "build", // build system, dependencies, Prisma generation
        "ci", // CI configuration and scripts
        "chore", // maintenance that touches no src/ or test/ behaviour
        "revert", // reverts a previous commit
      ],
    ],
    // Scopes follow the module they touch: goals, areas, users, prisma, config...
    "scope-case": [2, "always", "kebab-case"],
  },
};

export default config;
