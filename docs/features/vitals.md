# Vitals (`/vitals`, `/vitals/[project]`)

> How is a real production app doing, measured by Afterlife itself: how long its CI takes per variant, how production
> behaves around each deploy, and did the adjustments agents claimed actually move anything?

## What it does
- `/vitals` lists the **real projects** Afterlife watches (saved by Onboard to `.belay/projects/<slug>.yml`): name,
  root, host, CI provider, cloud, when it was last collected and how many runs are stored. With none it says so and
  calls to **Onboard a project**. Enter or a double-click opens one.
- `/vitals/[project]` draws three bands on one scrolling page. Picking a row in any band shows it in the inspector.
  - **Delivery**: one row per CI variant (`master-full`, `master-hotfix`, `pr-feature`, `nightly`, ...), in the order
    the config lists them, then any variant id the runs carry that the config no longer lists, then **unclassified**
    (the runs no rule matched). Each row shows the pipeline, runs counted of runs stored, median and p90 duration,
    failure rate, the slowest stage by median, and a trend of the last 30 counted durations. The inspector holds the
    per-stage median / p90 table and the last 20 runs (id, branch, result, duration, a bar of their stages).
  - **Production**: one row per App Insights signal (requests, failed rate, p95 duration, exceptions, availability):
    the last 24 h figure, its sample, and a 7-day trend of 6-hour cells with a tick for every deploy seen in CI.
  - **Adjustments**: every claim an agent (through `belay report`) or a person made, joined by id with Afterlife's own
    measurements: **proposed** (no measurement), **measuring** (the latest is inconclusive with a side under n 3),
    then **credited**, **not-earned** or **inconclusive** from the latest measurement. The agent's figure is shown in a
    column labelled **Agent's claim**, beside the measurement, never in its place. A claim's inspector holds its
    **Re-measure** buttons, each shown only where it fits:
    - **Measure passively** (a CI claim with a variant): the variant's 5 natural runs before the change against the first
      5 from it. The change point is the first run whose commit holds `ref.sha` (`git merge-base --is-ancestor` in the
      project's checkout, binary-searched; else the exact sha), or with no sha the first run on `ref.branch`. Until both
      sides have 3 runs that time the target it answers "waiting: k of 5 after" and appends nothing.
    - **Queue N runs…** (a CI claim with a branch, Azure Pipelines): a sheet to pick N (1 to 5) showing the server's
      exact `queue-runs` preview (`az pipelines run --org … --project … --id <pipeline> --branch <branch> -o json` × N).
      Confirm queues them as the person and keeps the run ids in `<data>/vitals/<slug>/queued.jsonl`
      (`{claimId, runIds, at}`, not an adjustment line); the next collect that has stored all of them measures exactly
      those runs against the variant's runs before them (method `queued`), once per batch.
    - **Measure locally** (a `local-metric` claim naming one of the project's `runner.frontier` metrics): the runner's
      own T3 measurement (`runner/tech/measure.ts` `measureTech`) on the default branch (`origin/HEAD`) and on the
      change, each twice in a throwaway worktree with the project's setup, in the background (minutes).
  - **The verdict** (`src/server/vitals/measure/judge.ts`, bench-delta's tolerance: 0.05 by default, never above 0.10)
    compares medians. A wall-time side (ci-stage, ci-run, p95-ms) under 3 samples is **inconclusive**; a side whose
    spread ((max - min) / median) is above twice the tolerance is **inconclusive** (noisy); better beyond the
    tolerance in the claimed direction is **credited**; within it or worse is **not-earned**. The claim's
    `expectedPct` and `agentValue` are never read by the measure step (a test greps for it).
- The toolbar shows when the project was last collected and **Refresh**. A cold collect takes minutes (about 5 s per az
  call), so Refresh starts a **background job** on the server and answers at once; the page shows "collecting since …"
  and re-reads itself every 5 s while the job runs, then shows what it added or why it failed. Opening a project whose
  newest stored run was fetched more than 15 minutes ago starts the same job, unless one is running or finished in the
  last 15 minutes. There is no daemon: nothing polls once the job is done.
- **Show demo estate** (Settings > Data & connection): Auto (default), On or Off. Auto shows the invented estate only
  while no real project is saved. With it off, the sidebar keeps the real tools (Vitals, Onboard, Trace, Runs) and hides
  the demo screens (Fleet, Monitor, Needs you, Ladder, Maturity, Cycles, Task, Setup, Theater). Their routes still
  answer and wear the **Demo data — illustrative** strip, which every demo screen also wears while it is on and a real
  project exists. The front door's Enter Afterlife goes to `/vitals` once a real project is saved, else to `/fleet`.

## How it works
The screen host draws both screens (`features/vitals/screen/host.tsx`; the route pages are static shells). Their
stream (`screen/slices.ts`, loopback only) → `data/loadVitals.ts` reads `loadProjects()` (`@/server/discover`) and
`readCiRuns` / `readProd` / `readAdjustments` / `deployMarkers` (`@/server/vitals`) → `model/view.ts`, one fold per
band (`ciFold`, `prodFold`, `adjustmentsFold`; `buildView()` is all of them), one slice each → `VitalsScreen`
(client). The fold runs on the server, so the client receives rows, never the run history. A slug no saved project has
is a notFound slice.

- **Durations** are `finishedAt - startedAt`. A run still running, without `finishedAt`, or canceled is listed and not
  counted (a canceled run stopped part way). Median is the middle value; p90 is the nearest rank. A stage's time counts
  only for a finished stage of a counted run.
- **Failure rate** is failed / (succeeded + failed + partial): a running or canceled run is no verdict.
- **Production windows**: counts (requests, exceptions) add up; failed rate, p95 and availability are the hourly bins'
  mean weighted by each bin's sample `n`. Failed rate is a fraction (0..1) drawn as a percent; availability is a
  percent already. The band reads only `ProdPoint`, whichever source (App Insights, a Log Analytics HTTP-logs source)
  wrote it. A deploy marker
  sits at `(at - windowStart) / 7 days`; one outside the window is not drawn.
- **Refresh** is the server action `refreshVitals(slug)` (`data/actions.ts`). It refuses on the hosted replay
  (`BELAY_MODE=replay`), for a slug no saved project has, and for a request not addressed to this machine
  (`src/server/actions/local.ts`); otherwise it starts `collectProject(slug)` as an in-process job (`data/jobs.ts`, one per
  slug: `{startedAt, done?, error?, added?, total?, prodAdded?, probes?}`; a second start while one runs returns it),
  re-renders the route (`refresh` from next/cache) and returns. The loader puts the job on the view (`view.job`), and
  `hooks/useCollect.ts` calls `router.refresh()` every 5 s while it has no `done`. A restart forgets the jobs; the files
  are the record. A lapsed login (a
  failed probe naming `az login` or `glab auth login`, or `az-login` / `glab-auth` failing) shows the line that said so
  and the exact re-login command, copied through Copy Command (`src/lib/clipboard/copyCommand.ts`).
- **Demo estate**: the cookie `belay.demoEstate` (`src/lib/settings/demoEstate.ts`). The shell reads it with the number
  of saved projects (`src/components/shell/live/estateRead.ts`) into `ShellInfo.estate`, in the root layout's request-time
  read and in `GET /api/shell`. The nav filters by `navShown`, and `bars/estate/DemoEstateBanner` draws the strip by
  `demoBannerShown`.

## Rules it keeps
- **Unknown is never zero**: an absent figure is an omitted key and draws a dash; a variant with no run says "no runs";
  a signal with no bin in the last 24 h has no figure; a project never collected reads "never".
- **No demo number**: every figure on these two routes comes from the files Afterlife collected for a real project.
- **The claim never decides**: an adjustment's state reads only Afterlife's latest measurement.
- **Writes are the person's click**: Refresh only reads the providers, through the person's own CLI login. Queue N
  runs is a write as the person: the server's preview first, confirmed on a click (`src/server/actions/README.md`).

## Code map
| Path (under `src/app/features/vitals/`) | Role |
|---|---|
| `VitalsListScreen.tsx` | `/vitals`: the real projects table, or `VitalsEmpty` (the Onboard call) |
| `VitalsScreen.tsx` | `/vitals/[project]`: `VitalsBody` (window, toolbar, three bands, inspector) with `useCollect` |
| `components/bands/` | `DeliveryBand`, `ProductionBand` (+ `MarkedTrend`, the kit trend with deploy ticks), `AdjustmentsBand`, `Band` |
| `components/inspector/` | `VitalsInspector` → `VariantInspector`, `SignalInspector`, `AdjustmentInspector` (+ `AdjustmentActions`, the re-measures) |
| `components/write/` | `ProjectWriteSheet` (a project write's preview and confirm, also used by Onboard's save step), `QueueSheet` |
| `hooks/useProjectWrite.ts` | One project write's round trip: `previewAction` once on screen, `confirmAction` of that preview on the click |
| `data/remeasure.ts` | `measurePassiveAction`, `measureLocalAction` (background), gated like Refresh |
| `components/states/CollectNotice.tsx` | Collecting, collected, failed, `LoginExpired` with its copyable command |
| `components/BandTable.tsx` | One band's flat flow `OutlineTable` with row navigation |
| `hooks/useCollect.ts` | Refresh, the one collect on open when stale, the 5 s re-read while a job runs |
| `model/` | `stats`, `delivery`, `production`, `adjustments`, `freshness`, `format`, `view`, `types` (pure) |
| `data/loadVitals.ts`, `data/actions.ts`, `data/jobs.ts` | The server read; `refreshVitals`; the background collect jobs |
| `data/__fixtures__/grinex.ts` | A Grinex-Portal-shaped project, its runs, prod bins and adjustments (invented figures) |

## Tests
- `model/__tests__/delivery.test.ts`: median and p90 per variant and stage, failure rate, running and canceled runs not
  counted, unclassified grouping, a variant with no runs, a variant the config no longer lists.
- `model/__tests__/production.test.ts`: sums and n-weighted means, an empty 24 h, deploy marker placement and its edges.
- `model/__tests__/adjustments.test.ts`: the claim and measurement join, latest wins, proposed / measuring / verdicts,
  the agent figure never changing the state.
- `model/__tests__/view.test.ts`: the list summary, collect-on-open, lapsed-login detection, the words.
- `__tests__/screens.test.tsx`: every state rendered: no project, the list, the three bands, no runs, no cloud, no
  adjustments, collecting, login expired, collect failed, collected.
- `src/server/vitals/measure/__tests__/`: judge (credited, not-earned, inconclusive by n and by spread, direction up
  and down, the tolerance ceiling), passive on ten runs (5 before / 5 after, ancestry, waiting), queued (waiting, once
  per batch), local with `measureTech` faked at its seam, the agent value never read.
- `data/actions.test.ts`: `refreshVitals` refuses on the replay, for an unknown slug and off this machine, and answers
  before the collect settles. `data/jobs.test.ts`: background start, one job per slug, a failure recorded, never thrown.
- `src/lib/settings/demoEstate.test.ts`: the nav with the demo estate on, off and auto, the banner, the door's target.

## Status and limits
- Reads what WP1 (`loadProjects`), WP2 (`readCiRuns`, `collectProject`), WP4 (`readProd`, `deployMarkers`) and WP5
  (`readAdjustments`) store; until they land, the list is empty and Refresh shows the collector's error.
- A queued batch is measured by the next collect started from this server (Refresh or the collect on open), not by
  `belay collect` from a shell. The local measure's job is in-process and unlisted: a restart forgets it, and its
  failure goes to the server log only.
