# Fleet (`/fleet`)

> Which of my projects need attention, and how much autonomy does each one run with?

## What it does
- Lists every project as one row, grouped by GitLab group, in three views: **Tiers** (count of classes at each of
  the five autonomy tiers), **Classes** (the tier of each of the twelve action classes) and **Stages** (rung 0-4 on
  each of the nine stages). Every view also shows state, decisions waiting, 7-day proofs and feed age.
- Narrows the list from the sidebar or toolbar lozenge: all projects, one group, or one of six smart filters (Needs
  you, Stale, Setting up, Not watched, Has quarantine, Hands-off). The Filter menu adds states and tiers; search
  matches name, group and description. Sort by attention (default), a column, or by pressing a tier header to rank by
  that tier (its column is tinted, the other four dimmed).
- Selecting a row opens the inspector: Needs you, Classes, Proofs, Stages, **Improvement**, Feed, Events, and (deep
  project only) Tracks. Selecting a group row shows group totals.
- The **Improvement** section places the project in the improvement loop:
  - the project in cycles (the deep project) shows `+N rungs since day 0 · M of 36 held · C<n> running` and an
    **Open Cycles** button (`/cycles`);
  - a watched or stale project reads "not started" and offers **Start in Onboard** (`/onboard`), explaining that
    arming T6 opens its cycle C1 as one MR in belay-policy;
  - a project setting up or not set up reads "onboard first" and offers **Onboard it**.
- `?project=<id>` deep link: the page opens with that project selected (used by the command palette). An unknown id
  is ignored and the deep project is selected instead. The screen is keyed by the pick, so following a second link to
  `/fleet` re-selects.
- Right-click a row: Open, Re-poll, Copy Project Path, Reveal in GitLab, Collapse/Expand the group. Right-click a
  group: Expand/Collapse, Collapse All, Expand All, Show Only This Group.

## How it works
- `src/app/fleet/page.tsx` (server) calls `loadFleetData()`, validates `?project=` against the loaded projects and
  renders `FleetScreen` keyed by the pick.
- `data/loadFleetData.ts` reads the DataSource (fleet, portfolio, stages, tiers, cockpit, needs-you, action classes,
  events, tracks, `deepProjectId`) and the Cycles loader (`loadCyclesData`) to build `deep.cycle`: the running cycle
  id, closed cycle count, rungs held now (`total(scanned)`) and gained since day 0 (`total(scanned) - total(day0)`).
- Pure model (`model/`):
  - `list/smartFilters.ts`, `list/filtering.ts`: `SMART_FILTERS`, `filterProjects`, `filterCount`, `sourceLabel`.
  - `list/sorting.ts`: `byAttention` (needs-you first, then sickest state, then name), `sortValue` per column
    (unknown values return `null`), `sortProjects`, `rankedTier` / `columnRole`, `sortAfterViewChange`.
  - `columns.ts`: `fleetColumns(view, meta)` and `gridFor(view, narrow)`.
  - `groups.ts`: `groupBlocks`, `navItems`, `needsSum`, `tierTotal`, `proofsSum`, `stageAverage`.
  - `needs.ts`: `waitingCount`, `resolveOne`, `repoll`, `statusLine`, `nextPolled`.
  - `inspector.ts`: `recordLabel`, `classTip`, `needsMeta`, `feedRows`, `waitingTitle`.
  - `menus/`: Sort, Filter and context menu entries.
- Hooks hold client state: `useFleetList` (view, filters, sort, grouping), `useFleetProjects` (the in-browser copy
  of the projects, resolve and re-poll), `useFleetMenus`, `useFleetKeys`, `useRowHandlers`, `useNarrow`,
  `useSectionOpen` (open sections remembered across selections).
- Components draw on the shared kit: `Window`, `OutlineTable`, `useRowNavigation`, `InspectorSection`, popover and
  toast.

## Rules it keeps
- Unknown is never zero: sort values for unknowns are `null` and always sink in either direction; group totals skip
  unwatched projects for needs-you, unarmed projects for tier counts and unknown proofs; stage averages use only
  known rungs (null when none); an unknown feed status is drawn dim, never as "ok"; unknown proofs draw "?".
- Nothing is written. Resolving a decision and re-polling change only this screen's state (`useFleetProjects`); a
  decision resolves once and a count never goes below zero. Re-poll fails on an unwatched project or a broken feed.
- Demo actions say so: "Set up…", "Review queue", "Open in GitLab" and "Reveal in GitLab" only flash a status line
  marked "(demo)" or "(demo, no network)".
- The deep project's decision buttons carry the exact effect (`does`) as their tooltip.

## Code map
| Path (under src/app/features/fleet/) | Role |
|---|---|
| `FleetScreen.tsx` | Composes the Window: toolbar, sidebar, table, inspector, status bar, legend |
| `data/loadFleetData.ts` | Server loader; adds the deep project's cycle standing from Cycles |
| `model/types.ts` | `FleetData`, `DeepProject`, views, sources, sort keys |
| `model/list/` | Smart filters, filtering, sorting |
| `model/columns.ts`, `model/groups.ts` | Columns and grid tracks; group blocks, nav rows, totals |
| `model/needs.ts`, `model/inspector.ts` | Waiting count, resolve, re-poll, status line; inspector wording |
| `model/menus/` | Sort, Filter and context menus |
| `hooks/` | List state, project mutations, menus, keys, row handlers, narrow flag, section state |
| `components/table/` | `FleetTable`, `FleetHeader`, `ProjectRow`, `GroupTotalsRow`, `cells/` |
| `components/toolbar/` | `FleetToolbar`, `StatusLozenge`, `CountDot` |
| `components/sidebar/FleetSidebar.tsx` | All projects, groups, smart filters |
| `components/inspector/` | `FleetInspector`, `ProjectInspector`, `GroupInspector`, `sections/` (one file per section) |
| `components/popover/TierPopover.tsx` | Tier-cell hover card |
| `components/legend/FleetLegend.tsx`, `components/FleetStatus.tsx` | Legend ("?"), status bar with poll counter |

## Tests
- `model/list/filtering.test.ts`, `model/list/sorting.test.ts`: smart filters, sources, search, menu filters,
  attention rank, unknowns sinking, tier re-rank, sort reset on view change, labels.
- `model/columns.test.ts`, `model/groups.test.ts`: columns per view, grid tracks, group blocks, nav rows, totals.
- `model/needs.test.ts`, `model/inspector.test.ts`, `model/menus/menus.test.ts`: waiting count, resolve, re-poll,
  status line; record labels, decision meta, feed rows; Sort, Filter and context menus.
- `components/inspector/improvement.test.ts`: the Improvement section for the project in cycles, a watched project
  and an unwatched one.
- `src/server/data/__tests__/parity.test.ts`: `loadFleetData` returns the same data from the live (fake group) source
  as from the demo source.

## Status and limits
- Data comes from `getDataSource()` (`src/server/data`): demo fixture by default, live index with `BELAY_MODE=live`.
  Tracks, events and cockpit text remain the demo catalogue in live mode.
- Only the deep project (default `ledgerline`) has real decisions, class records, events, tracks and a cycle history;
  other projects show counts and demo actions.
- The "polled N s ago" counter is a local ticker that wraps after 59 s; it does not reflect real polls.
