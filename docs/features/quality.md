# Quality gates (`npm run verify`, `npm run smoke`)

> How does a change prove it did not break anything before it is pushed?

## What it does
- `npm run verify` runs typecheck, lint, the structure check, every unit and render test (Vitest, about 1,000 tests),
  and a production build.
- `npm run smoke`, with the app running, loads every static page under `src/app` (the door, then each screen; `/kit`,
  the dev gallery, is left out) at 1280, 1440 and 1920 px in each of the three text sizes (Smaller, Standard,
  Larger). It fails on any of:
  - a page or console error
  - toolbar controls that are clipped
  - an inspector toggle out of reach
  - anything in the content pane that scrolls sideways (tables may; mark another deliberate scroller with
    `data-scroll-x`)
- `npm run check:structure` keeps the code navigable: every file is at most 200 lines and every folder holds at most
  10 files.

## How it works
- Unit tests sit next to the code: `model/*.test.ts` for the pure models, `render.test.ts` per screen, which renders
  components with `renderToStaticMarkup`.
- `src/server/data/__tests__/parity.test.ts` runs every screen loader against the demo source and against a live
  source fed by the fake GitLab, and requires the same props.
- `scripts/smoke.mjs` uses Playwright (a dev dependency). `SMOKE_BASE` points it at the app (default
  `http://localhost:3000`). `SMOKE_QUICK=1` checks 1440 px at Standard only.
- `scripts/smoke/routes.mjs` reads the route list from the app tree (a `page.tsx` with no dynamic segment; route
  groups add none), so a new screen is checked without editing the script.
- `scripts/check-structure.mjs` walks one root; `check:structure` runs it over `src`, `engine`, `runner`, `cli` and
  `scripts`. `gitlab/` is not walked yet: it holds files over 200 lines and a folder over 10 files.

## The test runner (`npm test`)
- `npm test` runs only the tests that matter for what changed, plus the guard tests, through `scripts/test/run.mjs`
  (the throttled wrapper). It prints `plan: <n> test files (<m> guards) because <reason>` first, passes
  `--passWithNoTests`, forwards anything after `--` to Vitest, and exits with Vitest's exit code.
- `npm run test:all` is the whole suite (about 665 files) and `npm run test:fast` is the `unit` project alone. Both are the
  owner's call: nothing runs them automatically.
- `npm run test:guards` (`targeted.mjs --guards-only`) runs the guard tests alone.
- The changed set is the working tree, untracked files and the commits since `git merge-base HEAD main`, so a spark branch is
  judged against main; on main it is the working tree against `HEAD`. Renames count at both paths and a deleted file still
  pulls in its former importers. `--since <rev>` replaces the merge-base; `--since a..b` replays one committed range alone;
  `--plan` prints the plan and runs nothing.
- Selection: a changed test file runs itself; changed code under `src`, `engine`, `runner`, `cli`, `gitlab` or `scripts` runs
  the tests that import it (`scripts/test/related.mjs`, Vitest's own import graph, listed without running anything);
  docs, markdown, CSS, tokens, JSON and images relate to no test, so only the guards run.
- Guards are derived, never listed: `scripts/test/guards.mjs` reads every test file the Vitest `include` globs match and keeps
  those that walk or grep the tree (`readdirSync`, `globSync`, `process.cwd()`, `git ls-files`, or a read of a path under
  `src` or `docs`). They always run, because a new route or file can break them with no import linking the two. Nothing is cached.
- Infra changes (`package.json`, the lockfile, `vitest.config.ts`, `tsconfig*.json`, `next.config.ts`, `eslint.config.mjs`) run
  the guards, the changed and related tests, and the `unit` project when the config has one, then print
  `infra changed: the full suite is the owner's call (npm run test:all)`. The full suite is the owner's call.
- A long file list is split into several runs, because `run.mjs` goes through `cmd.exe` on Windows (8,191-character limit).

<!-- WP2: tiers and throttle -->
<!-- /WP2 -->

## Rules it keeps
- A layout check that always passes proves nothing: the smoke probes were checked against injected regressions (a
  4,000 px child in a screen's scroller, a 2,000 px toolbar control) before they were trusted.
- Before each push, a clean worktree of `HEAD` is typechecked, linted and tested. This catches files left out of git,
  for example by `.gitignore`.

## Things to know
- `.gitignore` ignores folders named `design/`, `scratch/` and `.contest/` anywhere in the tree, and `/docs/` at the
  root except `docs/concepts/`, `docs/features/` and `docs/report/`. A new folder with one of those names is silently
  left out of commits.
- The production build and a dev server together use a lot of memory; run one browser at a time when you run smoke
  checks in a small container.

## Code map
| Path | Role |
|---|---|
| `scripts/smoke.mjs` | Layout smoke check over every route × width × text size |
| `scripts/smoke/routes.mjs` | The routes it visits, read from `src/app` |
| `scripts/check-structure.mjs` | 200 lines per file, 10 files per folder |
| `vitest.config.ts` | Test runner: `*.test.*` under `src`, `engine`, `runner`, `cli`, `scripts` and `gitlab`; `@` → `src`, `server-only` stubbed |
| `scripts/test/targeted.mjs` | `npm test`: changed set, plan, run |
| `scripts/test/plan.mjs` | Pure planner: changed paths in, test files out |
| `scripts/test/guards.mjs` | Derives the tree-walking guard tests |
| `scripts/test/related.mjs` | Tests that import given source files |
| `scripts/tooling-config.test.mjs` | Checks the configs' hand-written path lists against the tree (ESLint ignores, Vitest include) |
| `src/server/data/__tests__/parity.test.ts` | Demo and live loaders agree |
