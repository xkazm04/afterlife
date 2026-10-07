# Fleet (F1)

Route `/fleet`, port of the approved Fleet prototype. `src/app/fleet/page.tsx` reads the data source on the server
(`data/loadFleetData.ts`, plus `data/loadFleetSource.ts`: the mode and the deep project's recent events) and renders the
client `FleetScreen`.

## Parts
- `FleetScreen.tsx` composes the Window: toolbar, sidebar, table, inspector, status bar, legend.
- `components/table/` the treegrid on the shared `OutlineTable`: `FleetTable`, `FleetHeader`,
  `ProjectRow`, `GroupTotalsRow`, and `cells/` (tier counts and pips, proofs).
- `components/toolbar/` views, status lozenge (a filter too), Sort / Filter / Search.
- `components/sidebar/` all projects, groups, six smart filters. `components/legend/` the "?".
- `components/inspector/` project and group inspector; `sections/` one file per section.
  The deep project (ledgerline) has resolvable decisions, class records, tasks (each linking to `/task/<id>`), events,
  tracks.
- `components/popover/` the tier-cell hover card; `components/FleetStatus.tsx` the poll counter.
- `hooks/` list state (`useFleetList`), demo mutations (`useFleetProjects`), menus, keys, row
  handlers, narrow / compact measuring, section open state, and `useRepoll` (simulated in demo, the server in live).

## Model (pure, tested)
- `model/list/` smart filters, filtering, sorting (attention rank, unknowns sink, tier re-rank).
- `model/columns.ts` columns and grid tracks per view. `model/groups.ts` group totals, keyboard rows.
- `model/menus/` the Sort, Filter and context menus. `model/needs.ts` waiting count, resolve,
  re-poll, status line. `model/inspector.ts` the inspector's wording.

## Data
Everything comes through the DataSource (`@/server/data`): the demo fixture, or the live index. The deep project's tasks
are the source's `getTasks()`, each with its stored verdict (no proof: none, never a pass). Its recent events are the
demo's feed in demo mode and, in live mode, read from the index's tasks, proofs and poll state; they travel in
`loadFleetSource` because they are not the same in both modes (`src/server/data/__tests__/parity.test.ts`). Button labels
of the ledgerline decisions are shared, in `@/lib/demo/needsActions`.

## Behaviour to know
- Demo mode: resolving a decision and re-polling only change this screen's state; nothing is written.
- Live mode: Re-poll calls the `repollAction` server action (`src/server/actions/repollAction.ts`), which runs one poll
  cycle of the live runtime (a read) and renders the route again from the fresh snapshot; the status bar says
  "Re-polled" only after that resolved, and says it failed otherwise. A decision's button opens Needs you instead of
  resolving it here. The "polled N s ago" counter starts from the snapshot's age and never wraps.
- Below 900px of pane the Tiers view drops pips and shows letter marks. Below ~1190px x scale of
  toolbar the lozenge drops its words (counts and tooltips stay).

## Local parts that other screens might want
- `components/toolbar/CountDot.tsx` the cyan count on a filtered toolbar button.
- `hooks/useEvent.ts` a stable callback that runs the latest function (for memoised rows).
- `hooks/useNarrow.ts` width-threshold flag via ResizeObserver.
