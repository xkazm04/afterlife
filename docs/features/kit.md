# Kit (`src/components`, gallery at `/kit`)

> Which shared parts does every screen build from, and what does each one promise?

## What it does
- Provides the macOS-style frame every screen lives in: `shell/Window` with sidebar navigation, toolbar, content pane,
  optional inspector and status bar.
- Provides the dense table (`table/OutlineTable`), overlays (`Sheet`, popover, menu, toast), inspector blocks, status
  and honesty chips, small visualisations, controls and icons.
- Provides the Cmd/Ctrl+K command palette (`palette/CommandPalette`), mounted once for the whole app.
- Sizes everything from the text-size variables in `src/styles/text-size.css`, so every part follows the Smaller /
  Standard / Larger setting. Colours come only from `src/styles/tokens.css`.
- Shows every component in every state at `/kit` (`src/app/features/kit`). `kitCoverage.test.ts` lists the exported
  components from `src/components` on disk and fails when one is neither named by the kit nor exempt with a reason
  (the parts `Window` draws itself, the palette, `ShellProvider`, the live-only `PollStatus`).

## How it works
- **Window** (`shell/Window.tsx`, client): props `title`, `subtitle`, `toolbar`, `sidebar`, `inspector`,
  `inspectorOpen` / `defaultInspectorOpen` / `onInspectorOpenChange`, `status`, `help` / `helpTitle`, `children`.
  Without `inspector` there is no inspector and no toggle; with one, Cmd/Ctrl+I toggles it. It draws `Backdrop` behind
  itself and tracks window focus for the traffic lights.
- **Toolbar** (`shell/bars/Toolbar.tsx`): title and subtitle, the screen's controls in a middle slot, then an `end`
  slot (the inspector toggle). The header is a size container named `toolbar` (`container: toolbar / inline-size`,
  font-size `--t-body`, so `em` thresholds scale with text size). Controls fold by `@container toolbar` rules: the
  subtitle hides under 50em, `PopupButton` labels go icon-only under 72em, `Stepper` keeps only the current step's
  name under 76em, `Lozenge` words hide under 84em and the whole lozenge under 44em. Folded words stay available to
  assistive tech. If controls still do not fit, the middle slot clips; `end` sits outside it and is never clipped.
- **Sidebar** (`shell/sidebar/`): traffic lights and a hide button, `AppNav` from `navItems.ts` (Fleet, Monitor, Needs
  you with a badge, Ladder, Maturity, Cycles, Task, Onboard, Setup, Theater, Runs), the screen's own `SidebarSection` /
  `SidebarItem` content, and Settings pinned at the bottom. `activeNavKey(pathname)` marks the current item; each
  entry owns its sub-paths and `/` matches none. `SidebarItem` with `href` is a link, without it a filter button; an
  empty count takes no room, 0 still shows.
- **StatusBar**: the screen's status on the left, the transient `useToast().status` message (`aria-live="polite"`),
  in live mode the poll line (`bars/poll/PollStatus`: the last good poll's age, a failure and Re-poll), the data label
  (`bars/dataLabel`: "illustrative demo data" in demo only; live says "live data · <group>", or the seeded fake
  GitLab), and the `?` help popover. The shell's numbers come from `ShellContext`, re-read from `/api/shell` on
  navigation and focus (`live/sync.ts`).
- **Fallbacks and detail** (`shell/fallback/`, `shell/detail/`, `shell/host/reveal/`): `ErrorView` and `NotFoundView`
  behind `app/error.tsx`, `global-error.tsx` and `not-found.tsx`; `EntityNotFound` for a dynamic route whose thing is
  missing; `Unread` and `Reveal`, a screen's dash for a value not read yet and its regions settling in order as
  slices land (the screen host; no loading window or skeleton any more); `DetailPage` / `DetailSection`, a nested page
  with a back link.
- **OutlineTable** (`table/`): a focusable treegrid with sticky header and sticky group rows, one selection exposed
  via `aria-activedescendant`. `columns` is a grid template of the data columns; a filler track and filler cells are
  appended so rows span the pane. `flat` drops group indentation, `menuing` keeps the selection bright while a menu is
  open, and `stickyEnd` pins the last data column (a row's actions) to the right edge while the table scrolls sideways
  (used by Ladder `ClassTable` and Needs-you `DecisionsTable`). `HeaderCell`, `RowGroup`, `GroupRow`, `Row` (`stale`,
  `muted`, `level`), `Cell`; `useSort` and `useRowNavigation` over pure `model/sort.ts`, `model/rowNavigation.ts`,
  `model/columns.ts`.
- **Overlays**: `Sheet` drops from the top of the content pane with a veil, and captures Escape first; Tab wraps
  inside it (`lib/keyboard/focusTrap`) and closing returns focus to the opener. `usePopover`
  (with `reopenGuard` so the press that closed a sticky popover does not reopen it), `Legend`, `useMenu` (items,
  separators, headings, `checked`, `glyph`, optional `onHighlight` and j/k keys; logic in `menuModel.ts`),
  `position.ts` for clamping and above/below flipping. `ToastProvider` / `useToast()` give `toast` (about 2.6 s,
  bottom centre) and `status` (about 4 s, status bar).
- **Inspector blocks**: `InspectorHeader`, `InspectorSection` (collapsible, `aux` note), `KeyValue`, `CommandBlock`
  (lines as commands with `$`, `{code, note}`, or `{note}` comment lines), `blocks/DiffBlock` with `parseDiff`,
  `blocks/Stats`, and `UntrustedText` (mono, dashed rule, rendered as text, never HTML).
- **Status**: `TierMark`, `TierChip`, `NeedsYouBadge`, `StateGlyph`, `FeedAge`, `GateSeenLine`, `chip/Chip` (tones plain, invariant,
  neutral, ok, bad, accent, pending, lag, you, unknown) and `chip/HonestyChip` (`seeded`, `simulated`, `unknown`,
  `stale` with age).
- **Viz**: `StageTicks`, `StageMeter`, `ProofBar`, `RungGlyph`, `DayStrip`, with cell logic in `viz/model/cells.ts`;
  `trend/TrendStrip` (a 28-day bar series, unknown days dashed) and `trend/TrendDelta` (a week's change, null a dash).
- **Controls**: `Button` (variants, `href` makes it a link), `ObjectLink` (read-only GitLab link; a click toasts what
  would open), `Checkbox`, `Kbd`, `Spacer`, and toolbar controls `ToolbarButton`, `PopupButton`, `SegmentedControl`,
  `Stepper`, `SearchField`, `Lozenge` / `LozengeButton` / `LozengeDivider`. Also `surface/Card`, `icons/Icon`,
  `shell/BottomDrawer`, `shell/dock/CommandDock`.
- **Command palette** (`palette/`): Cmd/Ctrl+K toggles it anywhere, `openPalette()` opens it by event.
  `model/items.ts` `paletteItems(projects)` lists every screen and Settings, seven loop actions (design a cycle, see
  cycles across the estate, preview an onboarding batch, send picked gaps, see what waits, take autonomy back, change text size) and every project (to
  `/fleet?project=<id>`). `model/rank.ts` `score` ranks prefix (shorter text first) over word start (80) over
  substring (60) over a subsequence (up to 40, fewer gaps better); a keyword match counts 0.8 of a label match; kind
  bonus screen 3, action 2, project 0; ties break by label. With an empty query only screens and actions show, so the
  ~184 projects never bury them. Limit 12. Up/Down, Enter, Esc; focus returns to where it was.
- **Styles**: `tokens.css` (Ghostwire palette, tier colours, radius and motion; the only file with colour literals),
  `text-size.css` (three variable sets under `html[data-text-size]` plus metrics derived from `--ui-scale`),
  `base.css` (reset, focus ring, reduced motion), `backdrop.css`.
- **Keyboard** (`src/lib/keyboard`): `matchHotkey` (case-insensitive key; `mod` = Cmd or Ctrl, and when absent neither
  may be held; Shift ignored unless given; Alt must match) and `isTypingTarget`. `useHotkeys` listens on the document,
  skips events already `defaultPrevented` or composing, skips single-key shortcuts while typing unless `allowInInput`,
  and prevents the browser default unless told not to.

## Rules it keeps
- Never colour alone: tiers are a letter mark plus colour (`data-tier` sets `--tc`).
- Sizes are `calc(Npx * var(--ui-scale))` or the row, control and type variables; no literal px for type.
- Honesty marks are explicit: seeded, simulated and unknown are dashed; stale is hatched with its age; `Row stale`
  dims tier marks, proof bars and stage ticks inside it. Unknown sorts last in either direction.
- The palette only navigates; it never writes. `ObjectLink` only toasts what would open.
- Untrusted prose is shown as text in `UntrustedText`, never as HTML.
- `Sheet` and popovers take Escape before `useHotkeys`.

## Code map
| Path | Role |
|---|---|
| `src/components/shell/` | `Window`, `bars/` (Toolbar, Inspector, StatusBar, `dataLabel`, `poll/`), `sidebar/`, `PaneScroll`, `BottomDrawer`, `dock/`, `detail/`, `fallback/`, `loading/`, `live/`, `ShellContext`, `Backdrop` |
| `src/components/table/` | `OutlineTable`, rows, cells, `useSort`, `useRowNavigation`, `model/` |
| `src/components/overlays/` | `Sheet`, `HelpButton`, `popover/`, `menu/`, `toast/`, `position.ts` |
| `src/components/inspector/` | Header, Section, KeyValue, CommandBlock, UntrustedText, `blocks/` |
| `src/components/status/` | Tier marks and chips, badge, glyph, feed age, `chip/` |
| `src/components/viz/` | Stage, proof, rung and day visuals, `trend/`, `model/cells.ts` |
| `src/components/controls/` | Buttons, links, checkbox, `toolbar/`, `lozenge/` |
| `src/components/palette/` | `CommandPalette`, `model/items.ts`, `model/rank.ts` |
| `src/components/surface/`, `icons/` | `Card`; `Icon` and glyphs |
| `src/styles/` | `tokens.css`, `text-size.css`, `base.css`, `backdrop.css` |
| `src/lib/keyboard/` | `hotkeys.ts` (pure), `useHotkeys.ts` |
| `src/app/Providers.tsx` | Mounts toasts, shell context, text-size keys and the palette once |
| `src/app/features/kit/` | The `/kit` gallery |

## Tests
- `palette/model/rank.test.ts`: empty query shows screens and actions only; prefix first and the shorter prefix first;
  word match then scattered subsequence last; keywords and project group match; project and screen hrefs.
- `table/model/sort.test.ts` (direction cycle, aria-sort, unknowns last, tiebreak, custom order, no mutation),
  `rowNavigation.test.ts` (clamping, group expand/collapse, Enter, safe DOM ids, type-ahead), `columns.test.ts`
  (tracks scale with text size).
- `overlays/position.test.ts`, `menu/menuModel.test.ts`, `popover/reopenGuard.test.ts`;
  `inspector/blocks/diff.test.ts`; `viz/model/cells.test.ts`; `shell/sidebar/navItems.test.ts`;
  `src/lib/keyboard/hotkeys.test.ts`.
- Component render tests (22 `.test.tsx` files): `shell/Window.test.tsx` and `Window.focus.test.tsx`,
  `bars/StatusBar.test.tsx` (with `poll/pollLine.test.ts` and `live/sync.test.ts`), `fallback/`, `controls/__tests__/`
  (Kbd, PopupButton, SearchField, SegmentedControl, Stepper, CSS states), `overlays/` (Menu, useMenu, HelpButton,
  ToastProvider, Sheet, escape layers), `inspector/blocks/`, `status/__tests__/`, `viz/__tests__/`, `viz/trend/`,
  `icons/glyphs.test.tsx`.
- `src/app/features/kit/kit.test.tsx` renders every gallery and the whole `/kit` screen (unique specimen labels, the
  section count, every icon glyph); `kitCoverage.test.ts` checks the kit against `src/components` on disk.

## Status and limits
- Pure models and most components have their own tests; the rest are exercised through feature server-render tests
  and the `/kit` gallery.
- `PollStatus` has no `/kit` specimen: it is drawn only on a live poll, and a specimen's Re-poll would poll the group.
- The palette searches only screens, seven fixed actions and project names/groups; it does not search tasks or MRs.
