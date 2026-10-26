# Screen host

One client host in the `(app)` layout owns in-app navigation. A click on an in-app link matches the URL against a route
table, and the screen's real frame (Window chrome, toolbar, panes) paints in the same frame as the click: no skeleton, no
loading bar, no Suspense fallback shape. Every value not read yet is an em dash. The data comes over **one streamed
request per screen**, a line per slice as each one resolves, and the screen's regions settle in, in a designed order.
Visited screens stay mounted in `<Activity>` (up to 10). Leaving one keeps its state. Coming back shows the kept state at
once and re-reads it quietly. A hard load or a reload prerenders the same frame (page.tsx is a static shell), and the
data always comes by the same stream.

Door (`/`) and About (`/about`) stay real routes outside the host. A key no module has converted yet is not claimed:
the router and its page.tsx draw it as before (Fleet and Needs you until W1 and W2 convert them).

## Files

| Path | What |
|---|---|
| `src/components/shell/host/model/routes.ts` | `SCREEN_KEYS`, `ScreenKey`, `matchRoute(pathname, search)`, `pathFor`, `paramOf`, `moduleOf` (pure, shared with the server) |
| `src/components/shell/host/model/wire.ts` | the NDJSON line type, `SliceState`, `screenUrl`, `lineSplitter` (pure) |
| `src/components/shell/host/model/entry.ts` | how a line changes a screen's read state; the LRU (pure) |
| `src/components/shell/host/model/click.ts` | which document clicks the host takes (pure) |
| `src/components/shell/host/model/types.ts` | `ScreenDef`, `ScreenFrameProps` |
| `src/components/shell/host/hooks/` | `store.ts` (state, reads), `navigation.ts` (push/replace, popstate, click delegation), `useSlice.ts` (screen hooks), `scope.tsx`, `readStream.ts` |
| `src/components/shell/host/reveal/Reveal.tsx` | `<Reveal>` and `<Unread>`; tokens `--reveal-step` (60ms) and `--reveal-dur` (140ms) in `src/styles/tokens.css` |
| `src/components/shell/host/ScreenHost.tsx` | the host the layout mounts |
| `src/components/shell/host/registry.ts` | client registry: imports every module's `screen/host.tsx`. Never edited by a module package |
| `src/app/features/screens/registry.ts` | server registry: imports every module's `screen/slices.ts`. Never edited by a module package |
| `src/app/features/screens/stream.ts` | a `ScreenLoader` as an NDJSON `ReadableStream` |
| `src/app/features/screens/types.ts` | `ScreenLoader`, `SliceResult`, `SliceCtx`, `ModuleLoaders`, `ok()`, `notFound()`, `redirectTo()` |
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
act as the person's own logins (onboard, vitals, runs, theater start), as `src/app/api/onboard/answer.ts` does.

**Client side**, in `screen/host.tsx`:

```ts
export const screens: readonly ScreenDef[] = [
  { key: 'monitor', ready: true, slices: ['core', 'estate', 'desk'], Frame: MonitorFrame, title: () => 'Belay Monitor' },
];
```

- `slices` lists the loader's slice names in the same order (a test checks this for every ready screen).
- `Frame({ params, search })` reads `useSlice<T>(name)`: `{state:'unread'}`, `{state:'ok', data, asOf}` or
  `{state:'error', reason}`. `search` follows the URL, including the screen's own query changes.
- `Session` (optional) is a provider hoisted out of a route layout. It is mounted once around every visited screen that
  names the same component, for as long as any of them is mounted. Use one module-level component for the whole group
  (NeedsStore for needs-you and needs-you/[item]).
- `title(params, search)` gives the tab title. The host renders it as a React `<title>` and also sets `document.title`.
  Keep the same words as the page's metadata.
- `NotFound({ params })` is drawn when a slice answers `notFound`. Without it, the host draws a plain not-found window.
- `ready` is false by default: the host ignores the key. Set it to true only once the screen works end to end.

Hooks and parts, all from `@/components/shell/host`:

- `useSlice`, and `useScreenRead()` (`{ reading, asOf, notFound }`, for an "as of" note);
- `useHostNav()` gives `navigate(href)` and `replace(href)`. The host draws a claimed href in place; anything else goes
  through the router;
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
mark, decides what shows. A link with no query of its own returns to the query the screen was left with.

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
9. page.tsx becomes a static shell: `metadata` (or `generateMetadata`) and `return null`, with no `connection()` and no
   data. Keep every page.tsx. Delete the module's `loading.tsx`, Suspense fallbacks and skeletons (not the shared
   ScreenSkeleton/ShellLoading: W5 does that).
10. Set `ready: true`. `src/app/features/screens/registry.test.ts` then checks that the slices match the loader.
11. Tests: pure model tests for the slice reducers, and a render test per Frame with unread then ok slices
    (`monitor/screen/host.test.tsx`: `SliceFixture` plus mocks for `next/navigation` and `next/link`).
12. Verify in the browser (below), demo and `BELAY_GITLAB=fake` where relevant. Live-only paths go to
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
- **Remount keys.** The host remounts the Frame when the matched path changes (another param). A screen whose identity
  also lives in the query (cycles `?design`) must key its own subtree on it.
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
