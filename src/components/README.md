# Shared components

These are the macOS kit (D9) as React components. Each one sizes itself from the text-size
variables (D10), so it follows the Smaller / Standard / Larger setting. Every component is shown
in every state at **`/kit`**.

## Window (`shell/Window`, client)

`<Window>` is the frame of every screen. Inside the `(app)` route group it draws only the right column (toolbar,
pane, inspector, status bar); the persistent part is `frame/AppFrame({sidebar?})`, rendered once by
`app/(app)/layout.tsx`: the backdrop, the window box and the sidebar, which stay mounted (and stay hidden, once hidden)
across navigations. `frame/FrameContext` carries the sidebar's open state and the slot inside the sidebar that a screen's
`sidebar` sections portal into, so they mount and unmount with the screen. A Window rendered outside a frame (tests, a
page outside the group) draws its own `AppFrame` around itself. On a navigation only the right column animates
(`frame/Motion({enter?, exit?})`, React's `<ViewTransition>`; the classes are in `styles/transitions.css`, off under
prefers-reduced-motion). Ids a Window renders are per instance (`useId`), because Cache Components keeps a visited route
mounted but hidden in `<Activity>`, so two screens can be in the DOM at once; a hidden screen's effects, and so its
hotkeys, are cleaned up while it is hidden. Its props:

- `title`, `subtitle?`;
- `toolbar?`, rendered right of the title;
- `sidebar?`, extra sections below the app navigation;
- `inspector?`, Layer 2. Leave it out and there is no inspector and no toggle;
- `inspectorOpen?`, `defaultInspectorOpen?` (default `true`), `onInspectorOpenChange?`;
- `status?`, the status bar content on the left;
- `help?` and `helpTitle?`: the legend shown behind the "?" in the status bar;
- `children`, the content pane. It is `position: relative` and clips; use `PaneScroll`, or a
  `table/OutlineTable`, inside it.

The rest of the shell works without props:

- The active navigation item comes from the route.
- ⌘I (Ctrl+I on Windows and Linux; the tooltip names the key the platform uses) toggles the inspector.
- Settings is pinned at the bottom of the sidebar.
- The sidebar has two levels on one sliding track (`sidebar/levels/`). Level one is the app menu, in the four groups of
  `NAV_GROUPS` (Start, Watch, Govern, Improve; A to Z inside each), then the layout's help section. Level two is the
  screen in front's own `sidebar` sections under `levels/NestedHead` (the way back, "‹ Menu", and the screen's name). A
  Window with sections registers them while it is shown (`Frame.registerNested`), which brings the sidebar to level two;
  a screen without sections leaves it on the menu, and the current screen's menu entry (marked ›) opens its level again.
  The track slides (a cut under reduced motion) and the level out of view is inert.
- The status bar's right-hand label follows the data (`ShellInfo.data`, set by the root layout; `bars/dataLabel`). Demo, and any render without a `ShellProvider`: "illustrative demo data". Live: "live data · <group>", plus "some parts still demo, marked" while the source declares illustrative parts. Live on the seeded fake GitLab: "live mode · seeded fake GitLab, not a real group". Live never says "illustrative demo data".
- Live, the status bar also draws the poll line, `bars/poll/PollStatus({poll})`: the last good poll's age, a failed poll's reason and its Re-poll (one cycle of the whole group). It reads and re-polls through the server; `bars/poll/PollStatusView({poll, repoll, recheck})` is the same line with those two reads injected, which is how `/kit` draws its ok, late and failed tones without polling.
- Under the toolbar, `bars/estate/DemoEstateBanner` draws the one "Demo data — illustrative" strip on a demo screen (`DEMO_SCREENS` in `src/lib/settings/demoEstate.ts`) whenever a real project is saved or the demo estate is off (`ShellInfo.estate`, read by `live/estateRead`); elsewhere it is a 0-high row. The sidebar nav drops the demo screens while the demo estate is off.
- `PaneScroll({padded?})` is a scrolling pane for screens that are not tables.
- `SidebarSection({title, aux?})` and `SidebarItem({icon?, label, count?, current?, href?, title?,
  onClick?})` build sidebar content. `aux` is a dim note right-aligned on the heading's line ("2 / 7").
  With `href` an item is a link; without it, a filter button. An empty `count` (undefined, null, false
  or "") takes no room, so a long label keeps the whole row; a count of 0 still shows.

## Screen host (`shell/host`, client)

`host/ScreenHost` is mounted once by `app/(app)/layout.tsx` around the route's children: it draws every screen a module
has converted (its `screen/host.tsx` sets `ready`) itself, in place, from one streamed read per screen; see
`docs/features/screen-host.md` for the contract and the migration playbook. A screen's Frame uses, from
`@/components/shell/host`:

- `useSlice(name)`: the slice's state, unread, ok (data, asOf) or error (reason); `useScreenRead()`: the read as a whole;
- `host/Unread({label?})`: the em dash for a value not read yet, never 0;
- `host/Reveal({order?, slice?, className?, style?})`: a region that paints at once and settles in, in the screen's
  designed order, when its slice lands (`--reveal-step`, `--reveal-dur`; reduced motion: no animation);
- `useHostNav()` (`navigate`, `replace`) and `useRevalidate()` instead of `router.push` and `router.refresh`;
- `host/SliceFixture({slices?, states?})`: pins slices for a test or a specimen. `ScreenScope` is the host's own
  per-screen context and `host/HostNotFound` its window for a notFound slice when the screen gives no NotFound of its own.

## The parts

| Folder | Components |
|---|---|
| `controls/` | `Button({variant: default\|primary\|accent\|ghost\|danger, size: md\|mini, href?})`: with `href` it is a link (client navigation) in the same look<br>`ObjectLink({target, label?, message?})`: a read-only link to a GitLab object; a click toasts what would open and does not select the card around it<br>`Kbd`: a modifier glyph (⌘ ⌥ ⇧ ⌃) is drawn but spoken by name ("Command")<br>`Checkbox({checked, onChange, label, disabled?, describedBy?, title?})`: `describedBy` is the id of the text that says why a box is disabled (rendered as aria-describedby)<br>`Spacer`<br>`ToolbarButton({pressed?})`<br>`PopupButton({icon?, active?, expanded?})`: `expanded` says whether its menu is showing and is always emitted as aria-expanded, so pass it<br>`SegmentedControl<V>({options, value, onChange, label})`, an option is `{value, label: ReactNode, title?, count?, ariaLabel?}` (a node label, such as a tier mark, and a dim count that brightens when selected)<br>`Stepper<K>({steps, onGo, label})` (`controls/toolbar/`): segmented step progress, a step is `{k, name, title, enabled, current, past, count, loud}`; a loud count is the amber badge<br>`SearchField({value, onChange, placeholder?, label?, inputRef?})`: the "/" hint is drawn only with `inputRef` (the screen binds "/" to that field)<br>`useSearchKeys({searchRef, query, clear, toTable, clearFromAnywhere?})`: the field's "/" (focus and select) and Escape (in the field: clear a query, back to the table; `clearFromAnywhere` clears from the table too) for a screen's keymap<br>`Lozenge({label})`, `LozengeButton({lead?, count?, word?, pressed?, title?, onClick?})`, `LozengeDivider` |
| `overlays/` | `useMenu(build?)` returns `{menu, isOpen, openAt(x, y, opts), openFrom(el, opts), close}`. Render `{menu}` yourself. An item is `{label, run, sc?, checked?, disabled?, glyph?, data?}`, `{sep: true}` or `{head}`. `glyph` is a node before the label. `useMenu<D>(build?, {onHighlight?, vimKeys?, label?})`: `onHighlight(item \| null)` hears the highlighted action (read `item.data: D` to tell which), `vimKeys` adds j / k, `label` names the menu.<br>`usePopover(delay)` returns `{popover, isOpen, isSticky, show(el, node, {sticky?, delay?, placement?}), hide, toggle(el, node, placement?), close}`. A sticky popover is a dialog named by its trigger's aria-label or text. A press on the trigger closes a sticky popover and the click after it does not reopen it.<br>`Legend({rows})`<br>`Sheet({title, subtitle?, footer?, onClose})` opens inside the pane.<br>`HelpButton`<br>`useToast()` returns `{toast, status}`, under `toast/ToastProvider`, mounted once in `app/Providers`. |
| `table/` | `OutlineTable({label, columns, minWidth?, header, flat?, menuing?, activeId?, onKeyDown?, tableRef?, stickyEnd?, flow?})`: a treegrid; the filler track after the last column is layout only (aria-hidden). It fills the pane and scrolls itself; `flow` gives it its natural height inside a `PaneScroll` page instead (a band above it), with the header and group rows sticky to that page<br>`HeaderCell({sortKey?, sort?, onSort?, align?, tip?, iconOnly?, tier?, ranked?})`: a click sorts and leaves keyboard focus on the table<br>`RowGroup`, `GroupRow({id, label: ReactNode, count?, expanded, selected?, onSelect?, onToggle?, onContextMenu?})`<br>`Row({id, selected?, alt?, stale?, muted?, level?, onSelect?, onActivate?, onContextMenu?})`<br>`Cell({align?, indent?, data?})`<br>`useSort({initial, defaultDir?})` returns `{sort, toggle, set, reset}`<br>`useRowNavigation({...})` returns `onKeyDown`; PageUp / PageDown move by the rows that show, and the selection scrolls into view in the table or, for `flow`, in its page.<br>`model/`: `sortItems`, `compareValues`, `compareText`, `navigate`, `pageRows`, `rowDomId`, `groupNavId`, `px`, `range`, `repeatPx`, `minWidth`. |
| `status/` | `TierMark({tier, holders?, stale?})`, `TierChip({tier, children?})`<br>`NeedsYouBadge({count?, label?, variant: live\|last-known\|group, small?, showZero?, title?})`: `label` shows text (a picked gap's id) instead of the count and is always drawn<br>`StateGlyph({state})`<br>`chip/Chip({tone, compact?, push?, title?})`, tone is plain, invariant, neutral, ok, bad, accent, pending, lag, you or unknown; `compact` is the 16 px table-cell size<br>`chip/HonestyChip({kind: seeded\|simulated\|unknown\|stale, age?, children?, meaning?})` for the dashed honesty marks<br>`FeedAge({ageSec, ok, error?})`<br>`GateSeenLine({gate, since?, now?, demo?})`: "Gate last seen !41 at Hands-off, 4.9 h ago" or "Gate not seen since …" (`src/lib/promotion/gate/`); the age reads `now` when given, else the wall clock once mounted (`src/lib/clock/useNow`) |
| `viz/` | `StageTicks({rungs, labels?})`: a tick per stage named or rung given, a missing rung dashed unknown<br>`StageMeter({rung, showNumber?, deep?})`: the rung is clamped to 0..4; `deep` draws the lit bars green (R3 and above)<br>`ProofBar({proofs, block?})`<br>`RungGlyph({tier, ceiling, compact?})`<br>`DayStrip({clean, days?, revertedToday?})`<br>`trend/TrendStrip({values, label, days?, unit?})`: a 28-day mini series, a day with no row or an unknown value is a dashed cell, never a zero bar; `unit` (`['run', 'runs']`) names a cell that is not a day<br>`trend/TrendDelta({value, label, title?})`: a week's change as an arrow and a signed number; `null` is a dash, never 0 |
| `inspector/` | `InspectorHeader({title, icon?, sub?, path?})`<br>`InspectorSection({title, aux?, open?, defaultOpen?, onOpenChange?})`<br>`KeyValue({rows})`<br>`CommandBlock({commands, label?, prompt?})`: a line is a string (a command, with a "$"), `{code, note?}` (a dim note after the command) or `{note}` (a dim comment line); `prompt={false}` drops the "$"<br>`blocks/DiffBlock({file?, lines, label?})`, `lines` are `[mark, text]` pairs (`blocks/diff.ts` has the types and `parseDiff` for "+ x" strings)<br>`blocks/Stats({cells: {n, label, tone?}[]})`: big numbers over small words<br>`UntrustedText({source?})` |
| `shell/` | `BottomDrawer({title, count, hint?, closeLabel, onClose, compact?})`: a titled panel docked under a pane, with a lit count pill, a hide button and a scrolling live body (the content is the screen's)<br>`dock/CommandDock({line, title?})`, `dock/DockKey({optional?})`, `dock/DockText({tone: prompt\|note})`: the strip docked at the bottom of a `position: relative` pane, with the exact line the next key runs and the key hints (the optional ones go first under 820 px)<br>`fallback/ErrorView({error, retry})`, `fallback/NotFoundView()`: the views behind `app/error.tsx`, `global-error.tsx` and `not-found.tsx`. They depend on no provider and show no data. Next 16 hands the error boundary `retry`, not `reset`.<br>`fallback/EntityNotFound({title, note, href, back})`: the not-found card of a dynamic route, naming what is missing and linking back to its screen<br>`detail/DetailPage({parent, title, lede?, ...})` and `detail/DetailSection({title, aux?, wide?})`: a nested detail page (`/fleet/[project]`), the list's Window with a back link, no inspector and a column of section cards. It takes Window's `subtitle`, `toolbar`, `sidebar`, `status`, `help` and `helpTitle`<br>`live/ShellAdopt` `AdoptedShell({read, children})` and `ShellAdopt({info})`: the root layout's shell value - `PENDING_SHELL` in the prerendered shell, then each request-time read (the server read ShellRead, streamed in `<Suspense>` behind `connection()`) adopted before paint |
| `surface/` | `Card`: a quiet raised tile; layout is the caller's `className` |
| `icons/` | `Icon({name, label?, className?, style?})`: decorative (aria-hidden) unless `label`; a sized glyph box times `--ui-scale`; every glyph is in `icons/glyphs` (`GLYPHS`; the media marks play, pause, loop and present in `icons/transport`) |
| `palette/` | `CommandPalette()`: reads its project list from `GET /api/shell/projects` on first open (`palette/projects`, a page-life client store; "Loading projects..." until it lands); ⌘K (Ctrl+K) anywhere, or `openPalette()`; screens, the loop's actions and every project, ranked by `model/rank` (prefix, word start, substring, subsequence); it only navigates. Mounted once in `app/Providers`. With nothing typed it lists every screen and action; ↑↓ keep the highlighted row in view, Tab stays in the field, Esc closes through the overlay layers. |

## Conventions

- **Writes.** There is no shared write component: each screen keeps its own in `src/app/features/<screen>/write/`
  (preview by `previewId`, then confirm), over the server actions in `src/server/actions`.
- **Stale rows.** Put `stale` on a `Row` and the tier marks, proof bars, stage ticks and stage meters inside it
  dim themselves. Put `data` on body cells to get the hatching.
- **Tier colour.** Add `data-tier="hands_off"` (or any other tier) to an element and it gets the
  CSS variable `--tc`.
- **Sizes.** Fixed sizes are written as `calc(Npx * var(--ui-scale))`. Heights come from
  `--row-h`, `--ctl-h`, `--seg-h`, `--mini-h` and `--chip-h`. Type comes from `--t-body`,
  `--t-head` and `--t-small`.
- **Escape.** `Sheet`, sticky `Popover`s, `Menu` and the command palette close through `overlays/escapeLayers` (the
  layer opened last hears it, and the key is consumed), so `useHotkeys` won't also act on it.
- **Data.** Read demo data from `@/lib/demo` (typed). Tier metadata is in `@/lib/tiers`.
