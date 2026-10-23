# Fleet (F1)

Route `/fleet`, port of the approved Fleet prototype. `src/app/fleet/page.tsx` reads the data source on the server
(`data/loadFleetData.ts`, plus `data/loadFleetSource.ts`: the mode and the deep project's recent events) and renders the
client `FleetScreen`.

## Parts
- `FleetScreen.tsx` composes the Window: toolbar, sidebar, table, status bar, legend. A row opens its page, `/fleet/[project]` (`components/detail/ProjectDetail.tsx`).
- `components/table/` the treegrid on the shared `OutlineTable`: `FleetTable`, `FleetHeader`,
  `ProjectRow`, `GroupTotalsRow`, and `cells/` (tier counts and pips, proofs).
- `components/toolbar/` views, status lozenge (a filter too), Sort / Filter / Search.
- `components/sidebar/` all projects, groups, six smart filters. `components/legend/` the "?".
- `components/inspector/sections/` one file per card of the project page (there is no inspector drawer and no group page).
  The deep project (ledgerline) has resolvable decisions, class records, tasks (each linking to `/task/<id>`), events,
  tracks. `ImprovementSection` places the project in the loop: in cycles (what they earned, link to Cycles), ready to
  start one, or to be onboarded first. `/fleet?project=<id>` (the command palette's links) redirects to `/fleet/<id>`.
- `components/runner/` the cycle runner's strip above the table (`RunnerFleet`, collapsed `<details>`): every repo of
  `.belay/fleet.yml` and any repo that still has runs, with its checkout and base, its newest wave in words (running, to
  merge, merged, not mergeable), its lanes' outcomes, tokens, spend, and the decisions it left (a link to `/needs-you`).
  `app/fleet/page.tsx` reads it with `readDesk()` (`src/server/runs/`), real local data in demo and live alike; the trust
  table below is the data source's, untouched. Read-only. The repos whose spend matched no Fleet project are counted
  "not in Fleet" in its summary and named under it.
- Agent cost (`data/loadFleetEstate.ts`, `src/lib/runs/desk/join.ts`): the routes join the runner desk's rows onto the
  fleet's projects, by the fleet file's optional `gitlab:` path (the project's own path off its stored `webUrl`, else
  portfolio/group/id; the most specific match, ambiguous matches none) else by slug === project id. It travels as one
  `estate` prop (`FleetEstate`), never in `FleetProject`, so the demo/live parity is untouched. The project page's
  `sections/cost/CostSection` says spent and waves, a dash for a cost no repo reported, "Not metered" (and the repos
  not in Fleet) when no repo works it; the group row's last (feed) column sums the group's known costs, titled
  "n of m projects metered", a dash when none is, never $0. Per project and per group only, never per person.
- `components/popover/` the tier-cell hover card; `components/FleetStatus.tsx` the poll counter.
- `hooks/` list state (`useFleetList`), demo mutations (`useFleetProjects`), menus, keys, row
  handlers, narrow / compact measuring, and `useRepoll` (simulated in demo, the server in live).

## Model (pure, tested)
- `model/list/` smart filters, filtering, sorting (attention rank, unknowns sink, tier re-rank). `model/list/urlState.ts` encodes view, sort, filters, search, grouping and folded groups as search params (default = clean URL); `/fleet` decodes them on the server and the list replaces the URL as they change, so Back from a project restores the screen.
- `model/columns.ts` columns and grid tracks per view. `model/groups.ts` group totals, keyboard rows.
- `model/menus/` the Sort, Filter and context menus. `model/needs.ts` the
  re-poll and status line. `model/inspector.ts` the project page's wording.
- `model/project/view.ts` a project's page, decided once on the server (`data/loadFleetProject.ts`): its depth (the deep
  project's decisions, records, tasks, events and tracks, or any other's fleet row) and its buttons per mode (a link, disabled
  with the reason, or a flash in demo mode only). `/fleet` itself gets only `deepId` and the tier card's accepted counts.
- `model/changes/` what moved since the viewer's last look: `diff.ts` digests each project (tier counts, needs you,
  failing proofs, demotions, state) and returns typed changes, never from unknown (tiers unknown then read are a first
  read; null proofs say nothing); `baseline.ts` keeps the last look in localStorage (`belay.fleet.lastLook`) and never
  throws. `hooks/changes/useFleetChanges.ts` reads it after mount (no marks in server HTML), re-diffs each snapshot and
  takes Mark seen; a first visit takes that look as the baseline.

## Data
Everything comes through the DataSource (`@/server/data`): the demo fixture, or the live index. The deep project's tasks
are the source's `getTasks()`, each with its stored verdict (no proof: none, never a pass). Its recent events are the
demo's feed in demo mode and, in live mode, read from the index's tasks, proofs and poll state; they travel in
`loadFleetSource` because they are not the same in both modes (`src/server/data/__tests__/parity.test.ts`). Button labels
of the ledgerline decisions are shared, in `@/lib/demo/needsActions`.

## Behaviour to know
- Demo mode: re-polling only changes this screen's state; nothing is written.
- Live mode: Re-poll calls the `repollAction` server action (`src/server/actions/repollAction.ts`), which runs one poll
  cycle of the live runtime (a read) and renders the route again from the fresh snapshot; the status bar says
  "Re-polled" only after that resolved, and says it failed otherwise. A decision's button opens Needs you instead of
  resolving it here. Open in GitLab is a link to the project's GitLab page (new tab, no opener) once a poll stored its
  address (`webUrl`), and disabled with "the index stores no GitLab address yet" before. The "polled N s ago" counter starts from the snapshot's age and never wraps. Demo text still shown
  beside live rows (the deep project's tracks, its webhooks and unattributed count) carries a "demo" chip
  (`components/inspector/DemoChip.tsx`), as the data source's `illustrative` says.
- Tiers: a class's tier is recorded in tier-state.yml, capped by the policy (group-wide, the gate's own rule; not
  a per-project score and not computed from proofs). A project's tiers are known when it has class cells
  (`tiersKnown` in `src/lib/tiers.ts`), never from `armed`, which counts armed tracks (null: the poll could not read
  the CI file, said as unknown, never 0; `src/server/poller/ci/armed.ts`); unknown tiers show an empty
  cell, never 0. A class with no record yet ("–", No record yet) or split (several agents hold it: its most
  restrictive holder's letter then "÷", each holder at its own tier in the title, popover and project page, as CI gates
  each MR at its author's record) sits beside the Quarantined count, never in it, nor in the Has quarantine filter.
- Below 900px of pane the Tiers view drops pips and shows letter marks. Below ~1190px x scale of
  toolbar the lozenge drops its words (counts and tooltips stay).
- A project that moved since the last look has a dot after its name (`cells/ChangeMark.tsx`), titled with what moved
  and since when; the sidebar's "Changed since last look" (`src=changed`) lists only those, and Mark seen resets it.

## Local parts that other screens might want
- `components/toolbar/CountDot.tsx` the cyan count on a filtered toolbar button.
- `hooks/useEvent.ts` a stable callback that runs the latest function (for memoised rows).
- `hooks/useNarrow.ts` width-threshold flag via ResizeObserver.
