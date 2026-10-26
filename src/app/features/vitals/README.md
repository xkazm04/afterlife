# Vitals (`/vitals`, `/vitals/[project]`)

A real project's measured health: its CI stage times per variant, its production signals with the deploys on them, and
every adjustment an agent claimed beside Afterlife's own measurement. Read-only except Refresh, which collects through
the person's own az / glab login. Full description: `docs/features/vitals.md`.

- The screen host draws both (`screen/host.tsx`; `app/(app)/vitals/**/page.tsx` are static shells). `screen/slices.ts`
  streams them, loopback only: `/vitals` as `config | runs` (each row's last collected and runs stored fill in), a
  project as `config | job | ci | prod | adjustments` (notFound for an unknown slug). `model/slices.ts` folds the read
  slices into a view with the unread parts pending (a dash, `BandPending`); `states/Unreadable` says why a part could
  not be read ("Only on this machine." for a request from elsewhere).
- `data/loadVitals.ts` (server-only): `loadProjects` from `@/server/discover`, `readCiRuns` / `readProd` /
  `readAdjustments` / `deployMarkers` from `@/server/vitals`, folded band by band by `model/view.ts` so the client gets rows.
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
- `hooks/useCollect.ts`: Refresh, the one collect on open (`collectOnOpen`, decided once per showing of the screen, on
  that showing's fresh read), the 5 s re-read (the host's revalidate) while a job runs.
- `model/demo/`: the demo estate's projects (ledgerline, ledgerline-web, payments-gateway of acme-lab, from
  belay-demo.json). While the demo estate is on (`estate.demo`, read per request from the Settings cookie) both slices
  list them after the saved projects, marked `demo` (a saved project wins its slug). Their runs, production bins and
  adjustments are generated from the clock (`ci.ts`, `signals.ts`), never read from disk; the pages say "illustrative
  demo data", Refresh is off, nothing collects on open and no re-measure is offered.
- `data/__fixtures__/grinex.ts`: the Grinex-shaped fixture every test renders from.
