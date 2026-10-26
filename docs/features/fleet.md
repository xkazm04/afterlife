# Fleet (`/fleet`)

> Which of my projects need attention, and how much autonomy does each one run with?

## What it does
- Lists every project as one row, grouped by GitLab group, in three views: **Tiers** (count of classes at each of
  the five autonomy tiers), **Classes** (the tier of each action class the fleet lists) and **Stages** (rung 0-4 on
  each stage). Every view also shows state, decisions waiting, 7-day proofs and feed age.
- Narrows the list from the sidebar or toolbar lozenge: all projects, one group, or one of six smart filters (Needs
  you, Stale, Setting up, Not watched, Has quarantine, Hands-off). The Filter menu adds states and tiers; search
  matches name, group and description. Sort by attention (default), a column, or by pressing a tier header to rank by
  that tier (its column is tinted, the other four dimmed).
- Opening a row (click its name, Enter, or Open in its menu) goes to the project's page, `/fleet/<id>`: Needs you,
  Autonomy by class, Proofs, Tasks, Stages, **Improvement**, Agent cost, Stability, Trend, Feed, Recent events, and
  (deep project only) Tracks. There is no inspector drawer; a group row only takes the selection, and its cells are
  the group's totals.
- The **Improvement** card places the project in the improvement loop:
  - the project in cycles (the deep project) shows `+N rungs since day 0 · M of 36 held · C<n> running` and an
    **Open Cycles** button (`/cycles`);
  - a watched or stale project reads "not started" and offers **Start in Onboard** (`/onboard`), explaining that
    arming T6 opens its cycle C1 as one MR in belay-policy;
  - a project setting up or not set up reads "onboard first" and offers **Onboard it**.
- `?project=<id>` deep link (the command palette's): `/fleet` redirects to that project's page, `/fleet/<id>`. An
  unknown id is ignored and the list opens as usual.
- Right-click a row: Open, Re-poll, Copy Project Path, Reveal in GitLab, Collapse/Expand the group. Right-click a
  group: Expand/Collapse, Collapse All, Expand All, Show Only This Group.

## How it works
- `src/app/(app)/fleet/page.tsx` (server) calls `loadFleetData()`, redirects a known `?project=` to `/fleet/<id>`, decodes
  the list state from the URL (`decodeListState`) and renders `FleetScreen`. `src/app/(app)/fleet/[project]/page.tsx` renders
  `ProjectDetail` from `loadFleetProject(id)` (not found for an unknown id).
- `data/loadFleetData.ts` reads the DataSource (fleet, portfolio, stages, tiers, cockpit, needs-you, action classes,
  events, tracks, `deepProjectId`) and the Cycles loader (`loadCyclesData`) to build `deep.cycle`: the running cycle
  id, closed cycle count, rungs held now (`total(scanned)`) and gained since day 0 (`total(scanned) - total(day0)`).
- Pure model (`model/`):
  - `list/smartFilters.ts`, `list/filtering.ts`: `SMART_FILTERS`, `filterProjects`, `filterCount`, `sourceLabel`.
  - `list/sorting.ts`: `byAttention` (needs-you first, then sickest state, then name), `sortValue` per column
    (unknown values return `null`), `sortProjects`, `rankedTier` / `columnRole`, `sortAfterViewChange`.
  - `list/urlState.ts`: the view, sort, filters, search, grouping and folded groups as search params.
  - `columns.ts`: `fleetColumns(view, meta)` and `gridFor(view, narrow, meta)`.
  - `groups.ts`: `groupBlocks`, `navItems`, `needsSum`, `tierTotal`, `proofsSum`, `stageAverage`.
  - `needs.ts`: `repollMessage`, `repoll` (demo's simulated re-poll), `statusLine`, `nextPolled`.
  - `inspector.ts`: `recordLabel`, `classTip`, `needsMeta`, `feedRows`, `waitingTitle`.
  - `menus/`: Sort, Filter and context menu entries.
- Hooks hold client state: `useFleetList` (view, filters, sort, grouping, kept in the URL), `useFleetProjects` (the
  in-browser copy of the projects and demo's simulated re-poll), `useRepoll` (simulated in demo, the `repollAction`
  server action in live), `useFleetMenus`, `useFleetKeys`, `useRowHandlers`, `useEvent`, `useNarrow`,
  `useToolbarCompact`.
- Components draw on the shared kit: `Window`, `OutlineTable`, `useRowNavigation`, `InspectorSection`, popover and
  toast.

## Rules it keeps
- Unknown is never zero: sort values for unknowns are `null` and always sink in either direction; group totals skip
  unwatched projects for needs-you, unarmed projects for tier counts and unknown proofs; stage averages use only
  known rungs (null when none); an unknown feed status is drawn dim, never as "ok"; unknown proofs draw "?".
- Nothing is written. In demo mode, resolving one of the deep project's decisions (its page's Needs you card) and
  re-polling change only that screen's state; re-poll fails on an unwatched project or a broken feed. In live mode
  Re-poll runs one poll cycle on the server (a read), and a decision's button opens Needs you.
- Demo actions say so: in demo mode "Set up…", "Review queue", "Open in GitLab" and "Reveal in GitLab" only flash a
  status line marked "(demo)" or "(demo, no network)". In live mode Open in GitLab (the project page) and Reveal in
  GitLab (a row's menu) open the project's stored GitLab page (`webUrl`) in a new tab, and are disabled before a poll
  stored one.
- The deep project's decision buttons carry the exact effect (`does`) as their tooltip.

## Code map
| Path (under src/app/features/fleet/) | Role |
|---|---|
| `FleetScreen.tsx` | Composes the Window: toolbar, sidebar, table, inspector, status bar, legend |
| `data/loadFleetData.ts` | Server loader; adds the deep project's cycle standing from Cycles |
| `model/types.ts` | `FleetData`, `DeepProject`, views, sources, sort keys |
| `model/list/` | Smart filters, filtering, sorting |
| `model/columns.ts`, `model/groups.ts` | Columns and grid tracks; group blocks, nav rows, totals |
| `model/needs.ts`, `model/inspector.ts` | Re-poll and status line; the project page's wording |
| `model/project/view.ts`, `data/loadFleetProject.ts` | A project's page, decided once on the server |
| `model/menus/` | Sort, Filter and context menus |
| `hooks/` | List state, demo re-poll, live re-poll, menus, keys, row handlers, narrow and compact flags |
| `components/table/` | `FleetTable`, `FleetHeader`, `ProjectRow`, `GroupTotalsRow`, `cells/` |
| `components/toolbar/` | `FleetToolbar`, `StatusLozenge`, `CountDot` |
| `components/sidebar/FleetSidebar.tsx` | All projects, groups, smart filters |
| `components/detail/ProjectDetail.tsx` | The project page, `/fleet/<id>` |
| `components/inspector/sections/` | One card of the project page per file |
| `components/popover/TierPopover.tsx` | Tier-cell hover card |
| `components/legend/FleetLegend.tsx`, `components/FleetStatus.tsx` | Legend ("?"), status bar with poll counter |

## Tests
- `model/list/filtering.test.ts`, `model/list/sorting.test.ts`: smart filters, sources, search, menu filters,
  attention rank, unknowns sinking, tier re-rank, sort reset on view change, labels.
- `model/columns.test.ts`, `model/groups.test.ts`: columns per view, grid tracks, group blocks, nav rows, totals.
- `model/needs.test.ts`, `model/inspector.test.ts`, `model/menus/menus.test.ts`: re-poll messages, status line;
  record labels, decision meta, feed rows; Sort, Filter and context menus (Reveal in GitLab per mode).
- `hooks/useRepoll.test.tsx`: demo, unwatched, live answered and live rejected re-polls.
- `model/list/urlState.test.ts`: the list state round-trips through the URL, a sort on every drawn column included.
- `components/inspector/improvement.test.ts`: the Improvement section for the project in cycles, a watched project
  and an unwatched one.
- `src/server/data/__tests__/parity.test.ts`: `loadFleetData` returns the same data from the live (fake group) source
  as from the demo source.

## Status and limits
- Data comes from `getDataSource()` (`src/server/data`): demo fixture by default, live index with `AFTERLIFE_MODE=live`.
  The deep project's tracks and its cockpit text (webhooks, unattributed) remain the demo catalogue in live mode,
  marked with a "demo" chip; its recent events are read from the index.
- Only the deep project (default `ledgerline`) has real decisions, class records, events, tracks and a cycle history;
  other projects show counts and demo actions.
- The "polled N s ago" counter: in demo mode a local ticker that wraps after 59 s; in live mode it starts from the
  snapshot's age and only grows until a fresher snapshot arrives (a re-poll or a reload).
