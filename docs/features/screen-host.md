# Screen host

One client host in the `(app)` layout owns in-app navigation. A click on an in-app link matches the URL against a route
table, and the screen's real frame (Window chrome, toolbar, panes) paints in the same frame as the click: no skeleton, no
loading bar, no Suspense fallback shape. Every value not read yet is an em dash. The data comes over **one streamed
request per screen**, a line per slice as each one resolves, and the screen's regions settle in, in a designed order.
Visited screens stay mounted in `<Activity>` (up to 10). Leaving one keeps its state. Coming back shows the kept state at
once and re-reads it quietly. A hard load or a reload prerenders the same frame (page.tsx is a static shell), and the
data always comes by the same stream.

Door (`/`) and About (`/about`) stay real routes outside the host. Every route-table key is converted (`ready: true`); a
key a module marks not ready is not claimed, and the router and its page.tsx draw it.

## Files

| Path | What |
|---|---|
| `src/components/shell/host/model/routes.ts` | `SCREEN_KEYS`, `ScreenKey`, `matchRoute(pathname, search)`, `pathFor`, `paramOf`, `moduleOf` (pure, shared with the server) |
| `src/components/shell/host/model/wire.ts` | the NDJSON line type, `SliceState`, `screenUrl`, `lineSplitter` (pure) |
| `src/components/shell/host/model/entry.ts` | how a line changes a screen's read state; `carry` (paramSlices); the LRU (pure) |
| `src/components/shell/host/model/loc.ts` | `Loc`, and the query rules: `arrivalSearch`, `linkTarget`, `dropQuery` (pure) |
| `src/components/shell/host/model/click.ts` | which document clicks the host takes (pure) |
| `src/components/shell/host/model/types.ts` | `ScreenDef`, `ScreenFrameProps` |
| `src/components/shell/host/hooks/` | `store.ts` (state, reads), `navigation.ts` (push/replace, popstate, click delegation), `useSlice.ts` (screen hooks), `scope.tsx`, `readStream.ts` |
| `src/components/shell/host/reveal/Reveal.tsx` | `<Reveal>` and `<Unread>`; tokens `--reveal-step` (60ms) and `--reveal-dur` (140ms) in `src/styles/tokens.css` |
| `src/components/shell/host/ScreenHost.tsx` | the host the layout mounts |
| `src/components/shell/host/registry.ts` | client registry: imports every module's `screen/host.tsx`. Never edited by a module package |
| `src/app/features/screens/registry.ts` | server registry: imports every module's `screen/slices.ts`. Never edited by a module package |
| `src/app/features/screens/stream.ts` | a `ScreenLoader` as an NDJSON `ReadableStream` |
| `src/app/features/screens/types.ts` | `ScreenLoader`, `SliceResult`, `SliceCtx`, `ModuleLoaders`, `ok()`, `notFound()`, `redirectTo()` |
| `src/app/features/screens/paramPage.tsx` | `paramTitle(prefix, param)` and `ParamShell`: the one pattern for a `[param]` page.tsx |
| `src/app/api/screen/[key]/route.ts` | `GET /api/screen/<key>` |
| `src/app/features/<module>/screen/host.tsx` | the module's `screens: readonly ScreenDef[]` (client) |
| `src/app/features/<module>/screen/slices.ts` | the module's `loaders: ModuleLoaders` (server) |

The module files sit in a `screen/` subfolder, not at the module root: needs-you and maturity already hold 9 files at
their root, and a folder holds at most 10.

## The contract

**Wire.** `GET /api/screen/<key>?<query>` answers `application/x-ndjson`, never cached. `<key>` is a route-table key
as one percent-encoded segment (`fleet%2F%5Bproject%5D`). The key's param goes in the query under its own name
(`project`, `item`, `class`, `stage`, `id`, `node`), next to the page's own query; the param wins a clash. One line per
slice, then the terminator:

```
{"slice":"core","status":"ok","data":{...},"asOf":"2026-10-26T08:49:52.553Z"}
{"slice":"desk","status":"error","reason":"unreadable","asOf":"..."}
{"slice":"_end","status":"ok","asOf":"..."}
```

`status` is `ok` (with `data`), `notFound`, `redirect` (with `to`, an in-app href) or `error` (with a fixed `reason`).
An absent value is an omitted key, never null or 0. `data` is plain JSON only: the stream refuses a Map, Set, Date,
function or non-finite number (an `error` line, the path in the server log). Convert at the edge: send arrays, revive on
the client.

A key with no loader is a 404 `{"error":"unknown screen"}`. A param key without its param is a 400. A throw in a slice
is an `error` line: a `NotReadyError` gives its own message (live before the first poll), anything else `unreadable`,
with the message only in the server log. Every declared slice the stream never answered becomes an error on the client
(`not served`), so a dash never waits forever.

**Server side**, in `screen/slices.ts`:

```ts
export const loaders: ModuleLoaders = {
  monitor: {
    slices: { core: () => ok(loadMonitorData()), estate: () => ok(loadMonitorSignals()), desk: async () => ok({ cost: ... }) },
  },
};
```

All slices start at once, in declared order (a sync core is the first line), and each is written the moment it
resolves. A loader gets `{ params, search, signal }`; pass `signal` to a slow read that can stop. `local: true` makes the
whole screen loopback-only (a refused request gets one `_end` line with `reason: 'not-local'`, and the client fails
every slice with it); `local: ['start']` does that for the named slices only. Use it for keys that read local files or
act as the person's own logins (start's repos, vitals, runs' merges, theater start), as `src/app/api/onboard/answer.ts` does.

**Client side**, in `screen/host.tsx`:

```ts
export const screens: readonly ScreenDef[] = [
  { key: 'monitor', ready: true, slices: ['core', 'estate', 'desk'], Frame: MonitorFrame, title: () => 'Afterlife · Monitor' },
];
```

- `slices` lists the loader's slice names in the same order (a test checks this for every ready screen).
- `Frame({ params, search })` reads `useSlice<T>(name)`: `{state:'unread'}`, `{state:'ok', data, asOf}` or
  `{state:'error', reason}`. `search` follows the URL, including the screen's own query changes.
- `Session` (optional) is a provider hoisted out of a route layout. It is mounted once around every visited screen that
  names the same component, for as long as any of them is mounted. Use one module-level component for the whole group
  (NeedsStore for needs-you and needs-you/[item]). **A Session cannot read slices**: it sits outside every screen's
  `ScreenScope`, so `useSlice` in it is always unread and `useRevalidate()` needs an explicit key. The Frame feeds it:
  each Frame reads its slices and hands each arrival to the Session in an effect, and the Session skips a slice object
  it already applied (the host keeps the old object when a re-read brings the same text, so a screen shown again feeds
  nothing new). `setup/hooks/session/feed.tsx` (`useSetupFeed`) is the example.
- `paramSlices` (optional, a param key only): the slices that depend on the param. Another param then keeps every other
  slice and reads only these, plus any slice not read ok yet (`?_slices=detail,ledger` on the wire); without it
  another param is a new screen, every slice unread. The Frame still remounts per param (its UI state is the param's),
  and a region whose slice was kept is simply there (no entrance). Task: `['detail', 'ledger']`; setup/[node]:
  `['catalogue']` (the three live reads, the 11-probe doctor included, are kept across node clicks).
- `title(params, search)` gives the tab title. The host renders it as a React `<title>` and also sets `document.title`.
  Keep the same words as the page's metadata.
- `NotFound({ params })` is drawn when a slice answers `notFound`. Without it, the host draws a plain not-found window.
- `ready` is false by default: the host ignores the key. Set it to true only once the screen works end to end.

Hooks and parts, all from `@/components/shell/host`:

- `useSlice`, and `useScreenRead()` (`{ reading, asOf, notFound }`, for an "as of" note);
- `useHostNav()` gives `navigate(href)`, `replace(href)` and `replaceQuery(query)`. The host draws a claimed href in
  place; anything else goes through the router. `replaceQuery` is the quiet one for a screen's own state in its query
  (fleet's list): no history entry, no read, no remount, and both Next and the host learn the URL;
- `useHerePath()` is the path the app shows, the host's screen from the click's own frame (usePathname trails a host
  click by a frame): chrome that names the screen (the sidebar's current mark, the X-ray, the demo banner) reads it;
- `useRevalidate()` gives `(key?) => void`. It re-reads a screen quietly (default: the screen this component is in),
  keeping the read slices until fresh lines replace them. A visited screen that is not showing re-reads when it next
  shows. Outside the host it calls `router.refresh()`;
- `<Unread label?/>` draws the dash;
- `<Reveal order slice? className? style?>` wraps a region. It paints at once; with `slice` it waits until that slice
  is read (ok or error), then settles in after `order × --reveal-step`. Without `slice` it enters on mount. It enters
  once: a kept screen shown again does not replay. Under prefers-reduced-motion there is no animation. Reveal renders
  a plain `div`, so pass the region's layout (flex, min-height) through `className`;
- `<SliceFixture slices states>` pins slices for a render test or a kit specimen;
- `pendingScreen(key, title)` is the not-ready stub every module starts with.

**Navigation.** The host takes plain primary clicks on same-origin `<a href>` anywhere in the document (capture phase on
`window`, before React and `next/link`). It takes them when the href's key is claimed and ready, the anchor has no
`target` other than `_self`, no `download`, and no `data-host-nav="off"` on the anchor or an ancestor (use that for a
link whose own onClick does something else), and the click is not a jump within the page. Modified clicks (new tab)
stay the browser's. A plain `<Link>` to an in-app screen needs nothing. The host pushes
`history.pushState({ __host: key }, '', url)`; Next copies its own state in and syncs `usePathname`. The URL, not the
mark, decides what shows. A link with no query of its own returns to the query the screen was left with; a bare link
to the screen that is showing goes to the bare screen (it clears the query); a screen that answered a redirect forgets
its query. A screen that declares no slice (settings Display, Keyboard, About, the kit) reads nothing.

## Migration playbook (per module)

1. Read `src/app/features/monitor/screen/{host.tsx,slices.ts}`, `MonitorScreen.tsx` and `components/MonitorPending.tsx`.
   Copy their shape.
2. Split the page's reads into named slices in `screen/slices.ts`: a cheap sync core first, then each slow read
   (readDesk, ci-runs, humanKey, the setup live reads, the repo list) as its own slice. Keep each slice's payload to what
   its region needs.
3. Make the screen data-optional. Its Window, toolbar, sidebar sections and panes render from the first frame. Every
   unread value is `<Unread/>`, never 0 and never blank. Never draw an amber count you have not read. Reserve each
   region's real geometry so nothing moves when data lands.
4. Wrap regions in `<Reveal order slice>`. State the order in `host.tsx`'s header comment.
5. Fix every hook that seeds its state once from props: give it an arrived / reseed path that merges and does not wipe
   UI state. `useMonitor` shows the pattern: an empty constant until the data comes, then a `seen !== list` resync, and
   the default pick on first arrival.
6. Hoist the providers a route layout owned into `ScreenDef.Session`.
7. Replace `router.push`/`replace` with `useHostNav`. Replace `router.refresh` polls and refresh-after-action with
   `useRevalidate` (call it after the server action resolves).
8. `notFound()`/`redirect()` become slice statuses (`notFound()`, `redirectTo(href)` in slices.ts). Client-side
   `notFound()` calls too.
9. page.tsx becomes a static shell: `metadata` and `return null`, with no `connection()` and no data. A `[param]` page
   whose title names the param uses `paramTitle` and `ParamShell` (`features/screens/paramPage.tsx`), nothing else.
   Keep every page.tsx. There is no `loading.tsx`, no Suspense fallback shape and no skeleton anywhere
   (`src/app/noSkeleton.test.ts` fails on one).
10. Set `ready: true`. `src/app/features/screens/registry.test.ts` then checks that the slices match the loader.
11. Tests: pure model tests for the slice reducers, and a render test per Frame with unread then ok slices
    (`monitor/screen/host.test.tsx`: `SliceFixture` plus mocks for `next/navigation` and `next/link`).
12. Verify in the browser (below), demo and `AFTERLIFE_GITLAB=fake` where relevant. Live-only paths go to
    `docs/live-probe-checklist.md`.

## Pitfalls the scouts found

- **Reducers seeded once.** `useState(props.x)` or `useReducer(r, init(props))` ignores the data that arrives later.
  This is the main regression class.
- **Window portals and Activity.** A screen's sidebar sections portal into the frame. A hidden screen's portal is
  hidden with it, and its effects (hotkeys, polls) are cleaned up. Do not rely on effects in a screen that is not
  showing.
- **`<Activity>` needs an element.** The host wraps the route's page in a `display: contents` div. Without it, hiding
  the page's Activity hid the host screen's own window (the page renders no element of its own).
- **history.state.** Never `history.replaceState(null, ...)`: that wipes Next's state (and so the host's mark). Use
  `useHostNav().replace`, or pass `history.state` through. A `replaceState` that spreads `history.state` (it carries
  `__NA`) skips Next's sync. That is fine for a query-only change the screen tracks itself; the host reads the query
  when the screen is left.
- **Polls and refresh.** `router.refresh()` re-renders the route's page, which on a claimed route is the static shell:
  nothing changes. Use `useRevalidate`. A server action that calls `refresh()` must be followed by `revalidate(key)`.
- **notFound / redirect.** Send them as slice statuses. A redirect replaces the URL only while that screen is showing.
- **Remount keys.** The host remounts the Frame when the matched path changes (another param), with `paramSlices` too.
  A screen whose identity also lives in the query (cycles `?design`) must key its own subtree on it.
- **Hard load.** The host's pathname read sits behind `<Suspense fallback={null}>`. On a static route it resolves while
  prerendering, so the frame is in the static shell. On a param route the frame renders at request time.
- **Loopback.** A key that reads local files declares `local`. The Frame shows the existing "only on this machine" note
  when a slice's reason is `not-local`.
- **Dev only.** React StrictMode mounts the host twice in `next dev`, so a hard load reads the stream twice. The first
  read is aborted.

## How to verify

`node <scratchpad>/hostW0.mjs <worktree> http://127.0.0.1:<port>` (playwright, in the session scratchpad) drives the
following. Adapt its hrefs for your module.

- The click frame: it clicks the sidebar link inside the page, and at the first `requestAnimationFrame` after the click
  the window title, path and `document.title` must already be the target's.
- The reveal order: a MutationObserver logs each `[data-reveal]` region going `wait → in → done` with its order. `done`
  times must rise with the order. A return shows `done` at once, with no replay.
- Back and forward, a router detour (a not-converted tab and back), the legacy lists.
- A hard load: the raw HTML holds the frame and its dashes and no skeleton, and the page then fills.
- `curl -N` or a fetch reader on `/api/screen/<key>` shows the lines arriving apart (core first).

W0 measured on the Monitor in `next dev`, demo data: the frame is in the DOM, visible, at the first animation frame
after the click (path and title already set). Regions go `in` when core lands (about 150 to 300 ms on a cold dev
compile) and finish 60 to 70 ms apart in order. A return re-reads quietly, regions kept. The stream's core line arrives
about 20 ms before the 780 KB estate line. A production build (static shell from `next build`) was not measured.

## W3 notes (cycles, task, onboard, setup)

- **A Session cannot read slices.** It is mounted outside `ScreenScope`, so `useSlice` there is always unread and
  `useRevalidate()` needs an explicit key. Setup's pattern: the Session holds the state, and each Frame feeds it its
  slices in effects, skipping a slice object it already applied (`setup/hooks/session/feed.tsx`).
- **Query-scoped keys.** Cycles serves both scopes from one key: every slice reads `?scope=` and answers `{}` for the
  scope it does not draw; the Frame treats `{}` as unread (the other scope's kept answer stays a moment across a switch).
  (W5: the switch back is the bare `/cycles` again; a bare link to the showing screen clears its query.)
  The static shell is prerendered with no query, so a hard load of `?scope=estate` paints the project frame first.
- **Per-param instances.** Every `task/<id>` and `setup/<node>` remounts its Frame. Task keeps its filters and last
  docket rows in its Session. (W5: with `paramSlices` a j/k step reads only detail and ledger, and a node click only the
  catalogue; the docket, the page facts and setup's three live reads are kept.)
- **Kept runs.** A hidden screen's effects are cleaned up, so a screen whose work outlives a visit (the onboard
  wizard's proposal; since the merge of main, /start's stack run, `start/hooks/useStack.ts`) must not abort it on effect
  cleanup, and timers should count from a stored start.
- **Param `generateMetadata`.** A static shell whose title reads the param logs "runtime data in generateMetadata()" in
  dev. (W5: every `[param]` page uses `features/screens/paramPage.tsx`.)

## W4 notes (trace, theater, runs, settings, kit, the shell, door and about)

- **Static screens.** Settings Display, Keyboard and About and the kit declare no slice and have no loader. (W5: the
  host reads nothing for a screen that declares no slice; there is no 404 any more.)
- **The live gate** (W4: a client component in `trace/`; removed with Trace by the merge of main, see the merge notes).
- **The shell re-reads with the host** (`components/shell/live/hostNav.ts`): another screen showing, or a read of the
  one showing starting (a return, a poll, a write's revalidate), is one `/api/shell` read 300 ms later; a burst is one
  read. `requestShellRead()` (`live/sync.ts`) asks at once (the demo-estate cookie, /start's live node passing under the gate).
- **One pick rule, both sides.** Theater's film is `live/model/pick.ts` on the client and on the server: the server
  sends the replay film only when the address and the live payload pick it; the client draws what the same rule picks,
  `TheaterPending` (title, toolbar, a dash in the stage) until then. `live` and `film` share one runs read per request
  (memoised by the request's `signal`).
- **Loopback.** `theater` declares `local: ['start']` (off this machine "New run…" stays and says why); `runs` declares
  `local: ['merges']` only: its `runs` slice is the data `GET /api/runs` already serves publicly on the hosted replay,
  while `merges` names this machine's checkouts.
- **/settings** is not a route-table key: the sidebar's Settings link goes through the router to a static page whose
  client constant replaces the URL with `/settings/display` (`settings/screen/ToFront.tsx`), then the host draws it. One
  RSC round trip. (W5: the nav entry points at `/settings/display`, a host click, current on every sub-page; /settings
  keeps the redirect for deep links.)
- **View transitions.** `Motion` (`app-enter`/`app-exit`) does not run on a host swap: the swap is a sync store update,
  not a router transition, so `<ViewTransition>` never fires. The choreographed Reveal is the entrance now; the door's
  `door-exit` still runs (the door is a router navigation into the app).
- **Door.** `(door)/loading.tsx` and `DoorLoading` are gone. The page keeps its server render inside `<Suspense>` with
  a still `DoorFrame` (ground, horizon, brand plate, hero mark) as the prerendered fallback; DoorData stays monolithic.
  In `next dev` the frame and the city arrive within a few ms of each other in one response (in-memory demo reads).

## W1 notes (fleet, fleet/[project], vitals, vitals/[project])

- **Fleet's list state is the client's.** The stream sends no list state: `FleetFrame` decodes it from `search`
  (`decodeListState`), and `useFleetList` follows it: a new URL state the list does not already show is taken (back or
  forward between `/fleet?..` entries), a new fleet shape refits the state as it is (`model/screen/unread.ts`
  `listReseed`, `fitList`). The list fits a bookmarked group or class column only once the fleet is read, so an unread
  fleet never drops `src=g:payments`.
- **Only a person's change writes the URL.** A hard load hydrates with the default state before the host has read the
  query; writing that default would wipe `?view=stages`. The list writes through `useHostNav().replaceQuery` (W5; it
  was `fleet/screen/url.ts`):
  the state without Next's private keys, so Next's patched `replaceState` takes the URL as its own (a `router.refresh`
  elsewhere then keeps the query) and the host follows it without a re-read (SearchSync). A spread `history.state`
  (W0's pitfall advice) left Next's canonical URL behind, and the next Next history write put `/fleet` back.
- **A passing `search`.** On Back from `/fleet/<id>` to `/fleet?view=classes` the Frame gets `search` empty for a render
  (ScreenHost line 57: `st.loc` is still the project when Next's restore renders, so `search` falls to `''`).
  `useFleetList` ignores a URL state the address bar does not show. (W5: fixed in the host, `arrivalSearch`.)
- **The runner strip's slot** (`components/runner/RunnerSlot.tsx`) holds the strip's summary line from the first frame
  (dashes), so the table never moves when `desk` lands. The table's reveal region is the positioned box the table fills
  (an entrance transform on a plain wrapper would make it the table's containing block and collapse it).
- **The first look.** `useFleetChanges` takes the first *read* fleet as a first visit's baseline, never the empty
  unread one (that would mark every project as moved).
- **fleet/[project]** sends `projectCore` (the project, its view, the column names, the fleet's size), not the whole
  fleet; `estate` is that project's stability and its own trend rows only.
- **Vitals** is loopback only (`local: true`): a refused request shows "Only on this machine." (`Unreadable`). The project
  page's bands are separate slices (`config | job | ci | prod | adjustments`, `model/view.ts` folds, `model/slices.ts`
  `vitalsView`); an unread band is `BandPending` (a dash), never its empty state. The default pick is the first
  variant once `ci` lands, never over a person's pick. Collect on open is decided once per activation, on that showing's
  own fresh read (`useCollect`: config, ci and job read and no read in flight), so a kept copy never starts a collect.
  The job poll, Refresh, a passive measure and a confirmed write re-read through `useRevalidate`.
- **Title metadata on param routes.** `generateMetadata` reading `params` on an otherwise static page is an error under
  Cache Components ("runtime data in generateMetadata()", seen in `next dev` on `/fleet/<id>`); both `[project]` pages
  carry setup/[node]'s empty request-time marker. ladder/[class], maturity/[stage], needs-you/[item] and task/[id]
  return null with the same metadata, so they likely log the same error. (W5: one pattern for all, `paramPage.tsx`.)
- **Host changes asked for (Director):** (1) ScreenHost line 57: when Next renders a pathname the store has not seen,
  take `search` from `window.location.search` (or `st.locs[m.key].search`) instead of `''`; (2) on a redirect line,
  drop the redirecting screen's kept query (or its loc): today `/fleet?project=<id>` redirects, the fleet keeps
  `project=<id>` as its query, and the next plain link to `/fleet` (`withKeptQuery`) lands on that project again;
  (3) `hostNavigate` calls `withKeptQuery` before `keepSearch`, so a link to the screen showing uses its stale query;
  (4) a quiet query replace in `useHostNav` (what `fleet/screen/url.ts` does) would serve every screen that keeps
  state in its query. (W5: all four done.)
- **Measured** (`next dev`, demo, playwright `w1.mjs`): the Fleet frame is in the DOM at the first animation frame after
  the click (title, path, `document.title`, 18 dashes, no skeleton); regions go `in` together when core lands and finish
  in order (sidebar, table, strip about 50 to 80 ms apart). A return shows `done` at once and re-reads quietly.
  `/fleet/<id>`: 11 dashes at the first frame, cards finish by grid row 1 to 6, about 60 ms apart. The stream sends
  core (127 KB) first, then estate (788 KB) and desk. Back/forward between `/fleet?view=..` entries and through a
  project page keeps the list state; a hard load of `/fleet?view=stages` keeps it. Unknown ids draw the projects'
  EntityNotFound. Vitals: only the empty list (no project is onboarded in this worktree) and the unknown slug.

## W5 notes (host fixes, no skeleton anywhere)

- **Query rules** (`model/loc.ts`, pure and tested): Next rendering a path the host has not seen (a hard load, Back
  across a router navigation) takes the address bar's query, then the kept one, never an empty one while the address
  bar has one; `hostNavigate` learns the showing screen's own query before it picks a target; a bare link to the showing
  screen clears its query; a redirect line drops the redirecting screen's query (`/fleet?project=<id>` no longer sends
  the next plain Fleet link back to the project).
- **Back/forward reads once.** Next renders the popped pathname synchronously, so `followRouter` had already moved the
  host and started its read; `popstate` then read the same URL again and aborted the first. `onPop` now skips a read
  of the URL the host already shows with a read in flight (measured: two `/api/screen/fleet` requests per Back before,
  one after).
- **Partial reads** (`paramSlices`, `_slices=` on the wire, `carry` in `model/entry.ts`): measured in `next dev`, a task
  j/k step requests `task%2F%5Bid%5D?id=<id>&_slices=detail,ledger` and the docket shows at once (0 dashes); a setup
  node click requests `_slices=catalogue` only, and an unknown node still turns into the not-found card and back.
- **The one-frame overlap was not two windows.** At the first animation frame after a click exactly one Window header
  is visible (the target's): `<Activity>` hides the old screen in the same commit. What still named the old screen for
  a frame was chrome reading `usePathname`, which Next syncs in a transition after the host's `pushState`: the X-ray
  panel's header and the sidebar's `aria-current`. They read `useHerePath()` now; measured: every header and the
  current nav mark name the target at the first frame.
- **Settings** is a host click (`/settings/display`); `navEntryFor` matches an entry by its key's path.
- **Param pages**: `paramTitle(prefix, param)` + `ParamShell` for all seven; `routeBranches.test.tsx` pins it. The
  seven detail URLs hard-load with their titles and no console error in `next dev` (the server log itself was not
  readable from this session).
- **No skeleton anywhere**: `(app)/loading.tsx`, `ShellLoading` and `ScreenSkeleton` are deleted (the merge of main
  also dropped `(app)/start/loading.tsx` and /start's Suspense fallback). `src/app/noSkeleton.test.ts` fails on a loading
  file, a Skeleton/Loading component, or a Suspense fallback that is not null or a named still frame (DoorFrame,
  AboutFrame, the sidebar's nav lists with nothing current). Without `(app)/loading.tsx`, a router navigation into the
  app (the door's Enter) waits for the static shell's RSC instead of drawing a stand-in; every in-app click is the
  host's and never waits.

## Merge of main (Afterlife, /start)

Main renamed the app Belay -> Afterlife and replaced the Trace page and the Onboard wizard with one wizard at `/start`.
The merge keeps main's product and the host's mechanism:

- **Titles** are main's form everywhere: `Afterlife · <Screen>` (`ScreenDef.title` and the page metadata), a param page
  `Afterlife · <Screen> · <param>` (`paramTitle('Afterlife · Fleet', 'project')`), settings `Afterlife · Settings · <label>`.
  Env names are `AFTERLIFE_*` (main reads a `BELAY_*` fallback), the shell's event is `afterlife:shell-read`, the stream
  logs `afterlife:`.
- **Trace is gone** (key, route, screen, slices, the client gate). `/trace` and `/onboard` redirect to `/start`
  (next.config.ts). The Onboard module keeps one key, `onboard/estate`.
- **/start** is a host screen (`start/screen/{host.tsx,slices.ts}`): `facts` (gate/facts.ts `loadTraceFacts`, sync, reads
  `?rehearse=`) then `repos` (`local: ['repos']`, `listClaudeRepos`). `StartPending` (title, a disabled Re-check, dashes)
  until the facts land; then `StartScreen` mounts, its page a `<Reveal order={1}>`, and its probes stream from the client
  as main wrote them (`/api/start/probe`, `useProbe`: one run per showing). "Your repos" is a dash until `repos` lands
  (`model/stack/repos.ts` `reposOf`). The stack run is never aborted by leaving (`useStack`).
- **The live gate is main's**: a server component in the (app) layout (`start/gate/LiveGate.tsx`, behind Suspense and
  `connection()`) that covers the column with /start. It is read per request, so a host click does not re-read it; the
  host's own /start draws nothing while the facts name a gate (one wizard, one probe). When the cover's probe sees the
  live node pass, `useProbe` refreshes the router (the gate), re-reads the host's screen under it (`hostRevalidate()`)
  and asks the shell (`requestShellRead()`); a done action does the first two (`useStart`).
