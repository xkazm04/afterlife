# Quality gates (`npm run verify`, `npm run smoke`)

> How does a change prove it did not break anything before it is pushed?

## What it does
- `npm run verify` runs typecheck, lint, the structure check, every unit and render test (Vitest, about 1,000 tests),
  and a production build.
- `npm run smoke`, with the app running, loads every route at 1280, 1440 and 1920 px in each of the three text sizes
  (Smaller, Standard, Larger): 108 checks. It fails on any of:
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
- `scripts/check-structure.mjs` walks `src` and `engine`.

## Rules it keeps
- A layout check that always passes proves nothing: the smoke probes were checked against injected regressions (a
  4,000 px child in a screen's scroller, a 2,000 px toolbar control) before they were trusted.
- Before each push, a clean worktree of `HEAD` is typechecked, linted and tested. This catches files left out of git,
  for example by `.gitignore`.

## Things to know
- `.gitignore` ignores folders named `design/`, `scratch/` and `.contest/` anywhere in the tree, and `/docs/` at the
  root except `docs/features/` and `docs/report/`. A new folder with one of those names is silently left out of
  commits.
- The production build and a dev server together use a lot of memory; run one browser at a time when you run smoke
  checks in a small container.

## Code map
| Path | Role |
|---|---|
| `scripts/smoke.mjs` | Layout smoke check over every route × width × text size |
| `scripts/check-structure.mjs` | 200 lines per file, 10 files per folder |
| `vitest.config.ts` | Test runner: `src/**/*.test.ts(x)`, `@` → `src`, `server-only` stubbed |
| `src/server/data/__tests__/parity.test.ts` | Demo and live loaders agree |
