# Vitals (`/vitals`, `/vitals/[project]`)

A real project's measured health: its CI stage times per variant, its production signals with the deploys on them, and
every adjustment an agent claimed beside Afterlife's own measurement. Read-only except Refresh, which collects through
the person's own az / glab login. Full description: `docs/features/vitals.md`.

- `app/(app)/vitals/page.tsx`: `loadVitalsList()` on every request (after `await connection()`); `VitalsListScreen`.
- `app/(app)/vitals/[project]/page.tsx`: `loadVitalsProject(slug)`, `notFound()` for an unknown slug; `VitalsScreen`.
- `data/loadVitals.ts` (server-only): `loadProjects` from `@/server/discover`, `readCiRuns` / `readProd` /
  `readAdjustments` / `deployMarkers` from `@/server/vitals`, folded by `model/view.ts` so the client gets rows.
- `data/actions.ts`: `refreshVitals(slug)`, the one server action: refused on the hosted replay, for an unknown slug
  and off this machine; else it starts `collectProject(slug)` as a background job (`data/jobs.ts`, in-process, one per
  slug) and returns at once. The loader puts the job on the view; the client re-reads every 5 s while it runs.
- `model/` (pure, tested in `model/__tests__/`): `stats` (span, counted duration, median, p90), `delivery` (rows per
  variant, unclassified last), `production` (24 h figure, 6-hour trend cells, deploy markers), `adjustments` (claim +
  measurement join, state), `freshness` (collect on open after 15 min, lapsed login), `format`, `view`, `types`.
  Absent values stay omitted keys and draw a dash, never 0.
- `components/`: `BandTable` (one band's flat flow OutlineTable), `bands/` (Delivery, Production with `MarkedTrend`,
  Adjustments), `inspector/` (variant, signal, adjustment), `states/CollectNotice` (collecting, failed, collected,
  `LoginExpired` with Copy Command).
- `hooks/useCollect.ts`: Refresh, the one collect on open (`collectOnOpen`), the 5 s re-read while a job runs.
- `data/__fixtures__/grinex.ts`: the Grinex-shaped fixture every test renders from.
