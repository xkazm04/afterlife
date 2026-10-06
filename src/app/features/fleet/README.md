# Fleet (F1)

Route `/`, port of the approved Fleet prototype. `src/app/page.tsx` loads the demo on the server
(`data/loadFleetData.ts`) and renders the client `FleetScreen`.

## Parts
- `FleetScreen.tsx` composes the Window: toolbar, sidebar, table, inspector, status bar, legend.
- `components/table/` the treegrid on the shared `OutlineTable`: `FleetTable`, `FleetHeader`,
  `ProjectRow`, `GroupTotalsRow`, and `cells/` (tier counts and pips, proofs).
- `components/toolbar/` views, status lozenge (a filter too), Sort / Filter / Search.
- `components/sidebar/` all projects, groups, six smart filters. `components/legend/` the "?".
- `components/inspector/` project and group inspector; `sections/` one file per section.
  The deep project (ledgerline) has resolvable decisions, class records, events, tracks.
- `components/popover/` the tier-cell hover card; `components/FleetStatus.tsx` the poll counter.
- `hooks/` list state (`useFleetList`), demo mutations (`useFleetProjects`), menus, keys, row
  handlers, narrow / compact measuring, section open state.

## Model (pure, tested)
- `model/list/` smart filters, filtering, sorting (attention rank, unknowns sink, tier re-rank).
- `model/columns.ts` columns and grid tracks per view. `model/groups.ts` group totals, keyboard rows.
- `model/menus/` the Sort, Filter and context menus. `model/needs.ts` waiting count, resolve,
  re-poll, status line. `model/inspector.ts` the inspector's wording.

## Data
`data/needsActions.ts` button labels of the ledgerline decisions. Everything else is `@/lib/demo`.

## Behaviour to know
- Resolving a decision and re-polling only change this screen's state; nothing is written.
- Below 900px of pane the Tiers view drops pips and shows letter marks. Below ~1190px x scale of
  toolbar the lozenge drops its words (counts and tooltips stay).

## Local parts that other screens might want
- `components/toolbar/CountDot.tsx` the cyan count on a filtered toolbar button.
- `hooks/useEvent.ts` a stable callback that runs the latest function (for memoised rows).
- `hooks/useNarrow.ts` width-threshold flag via ResizeObserver.
