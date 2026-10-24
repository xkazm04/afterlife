# Onboard (`/onboard`)

> How far is the estate onboarded, what runs in the next batch, and what can only I do?

## What it does
- Brings a company's whole GitLab estate (the group's 184 projects in the demo) into Afterlife as a **funnel**:
  **Discovered → Baselined → Paired → Watching → In cycles**. Counts are cumulative: a watched project also counts as
  baselined.
- Shows each group as a stacked bar of where its projects sit (picking a group scopes the batch to it), and the
  **estate baseline**: stage × rung over every baselined project, with unrated projects counted. It names the weakest
  stage as the natural theme for the estate's first cycles.
- Plans the **next batch** in three parts:
  - **Only you**: merges, new project tokens, and setups already under way. These are listed for the whole estate.
  - **Reads**: day-0 scans and first polls. Every one runs.
  - **Writes**: bootstrap MRs (`arm-track`), then enroll MRs in `belay-policy` that open a project's first cycle
    (`enroll-track`). These are capped at 5, 10 or 20 per batch.
- **Preview batch** (or `/onboard?preview=1`) shows the exact commands for every read, and for every write the
  server's preview of its MR (`previewAction`). **Run as you** confirms only a preview on screen (`confirmAction`);
  reads are simulated and say so, and demo mode simulates the writes server side. **Re-probe** on a person step moves the project on once the (simulated) probe
  sees it done.
- The inspector says what Afterlife reads on its own, what it writes as you, and what it never does. A picked project
  shows its funnel step, its baseline and its one next command.

## How it works
`app/(app)/onboard/page.tsx` → `data/loadOnboardData.ts` (the fleet through the data source) → `model/build.ts`
`initialRuns()` → `OnboardScreen` → `hooks/useOnboard.ts` (run state, batch size and scope, selection, filter, sheet).

- `model/funnel.ts` `stepOf` decides each project's step from its state:
  - not set up, or nothing rated → discovered
  - setting up → baselined (paired from step 11)
  - stale → paired
  - otherwise → watching, or in cycles

  It also holds `funnel`, `byGroup`, `baseline` and `weakest`.
- `model/batch.ts`:
  - `nextAction` gives one action per project: the exact commands of a read or a person's step (a write carries
    the server intent instead, and no command of its own), who does it, the MRs it opens and the step it leads to.
  - `planBatch` sorts actions into yours / reads / capped writes. Bootstraps go to the best-rated projects first,
    first cycles to the weakest first; anything unrated goes last either way.
  - `runBatch` lands the reads; a write moves only when the server confirmed it, and then waits for its merge
    under the MR GitLab named (never a number made up here).
  - `resolve` moves a project on after a person's step.
- `model/build.ts` `initialRuns`:
  - fx-rates waits for its bootstrap merge, looked up by branch because its MR number is not in the data.
  - Setups at an unrecorded step wait for you.
  - Stale feeds wait for a renewed token.

## Rules it keeps
- **Only a probe moves a project on.** A write leaves the project where it is, waiting for its merge.
- **Writes go as you, capped, through the server.** A bootstrap is the same `arm-track` server action Setup sends,
  and a first cycle the same `enroll-track` (its MR in `belay-policy`). The screen shows the server's preview and
  confirms only that preview; it never spells a write itself. Afterlife holds no merge token.
- **What only you can do is never done by Afterlife** and stays visible whatever the scope.
- **Unknown is never zero**: unrated baselines are counted as unrated, and ordering uses the mean of rated stages
  only. A stale feed counts as paired, never as watching.
- A setup already under way is never offered a second bootstrap.

## Code map
| Path (under `src/app/features/onboard/`) | Role |
|---|---|
| `OnboardScreen.tsx` | The window: toolbar (writes per batch, Preview batch), funnel, cards, batch table, sheet |
| `components/funnel/` | The five-step funnel band; a step filters the batch table |
| `components/groups/` | `GroupBars` (stacked bars per group), `Baseline` (stage × rung histogram, weakest named) |
| `components/batch/` | `BatchTable` (yours / reads / writes, Re-probe), `BatchSheet` (read commands, write previews, Run as you) |
| `components/inspector/` | `OnboardInspector` (reads / writes / only you / the rule), `ProjectPanel` |
| `components/OnboardSidebar.tsx` | Scope: the whole estate or one group, with watched / total |
| `hooks/` | `useOnboard` (run state, batch, sheet), `useOnboardWrites` (previews asked once each, their confirms) |
| `write/` | `write.ts` the preview/confirm round trip, `send.ts` the Run loop (a confirm that threw says why) |
| `model/` | The pure model above |

## Tests
- `model/onboard.test.ts`:
  - the funnel over the demo fleet (one project in cycles in the fixture) is 184 → 175 → 166 → 155 → 1
  - fx-rates, unrecorded setups and stale tokens each wait on the right person step
  - batch caps and ordering, and a group scope that never hides your own steps
  - a write carries the server intent Setup sends and spells no command; a run moves only confirmed writes
  - enroll MRs live in belay-policy, and no bare `!N` reaches a shell
- `render.test.ts`: the funnel, bars, baseline, batch table and every project panel render, including unknown and
  simulated baselines.
- `write/write.test.ts`, `write/send.test.ts` (actions mocked): preview, confirm by the preview id on screen, nothing
  sent without one, and a confirm that threw says NO_ANSWER plus why (Next's digest included).
- `src/server/data/__tests__/parity.test.ts`: the loader gives the same data in demo and live mode.

## Status and limits
- Reads and re-probes are simulated in the browser. Their commands are the `belay` CLI's real ones: `scan` (read-only
  stage rating of the clone) and `doctor`. Writes go through the server actions; demo mode simulates them there.
- **In cycles** counts every project whose ledger records a closed cycle (`getEstateCycles()`: six in the demo).
  Cycles' estate scope (`/cycles?scope=estate`) shows them per group.
- Setup (`/setup`) remains the deep, one-project path. Onboard is the estate-wide one.
