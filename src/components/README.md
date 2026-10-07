# Shared components

These are the macOS kit (D9) as React components. Each one sizes itself from the text-size
variables (D10), so it follows the Smaller / Standard / Larger setting. Every component is shown
in every state at **`/kit`**.

## Window (`shell/Window`, client)

`<Window>` is the frame of every screen. Its props:

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
- ⌘I (Ctrl+I on Windows) toggles the inspector.
- Settings is pinned at the bottom of the sidebar.
- The status bar's right-hand label follows the data (`ShellInfo.data`, set by the root layout; `bars/dataLabel`). Demo, and any render without a `ShellProvider`: "illustrative demo data". Live: "live data · <group>", plus "some parts still demo, marked" while the source declares illustrative parts. Live on the seeded fake GitLab: "live mode · seeded fake GitLab, not a real group". Live never says "illustrative demo data".
- `PaneScroll({padded?})` is a scrolling pane for screens that are not tables.
- `SidebarSection({title, aux?})` and `SidebarItem({icon?, label, count?, current?, href?, title?,
  onClick?})` build sidebar content. `aux` is a dim note right-aligned on the heading's line ("2 / 7").
  With `href` an item is a link; without it, a filter button. An empty `count` (undefined, null, false
  or "") takes no room, so a long label keeps the whole row; a count of 0 still shows.

## The parts

| Folder | Components |
|---|---|
| `controls/` | `Button({variant: default\|primary\|accent\|ghost\|danger, size: md\|mini, href?})`: with `href` it is a link (client navigation) in the same look<br>`ObjectLink({target, label?, message?})`: a read-only link to a GitLab object; a click toasts what would open and does not select the card around it<br>`Kbd`<br>`Checkbox({checked, onChange, label, disabled?})`<br>`Spacer`<br>`ToolbarButton({pressed?})`<br>`PopupButton({icon?, active?})`<br>`SegmentedControl<V>({options, value, onChange, label})`, an option is `{value, label: ReactNode, title?, count?, ariaLabel?}` (a node label, such as a tier mark, and a dim count that brightens when selected)<br>`Stepper<K>({steps, onGo, label})` (`controls/toolbar/`): segmented step progress, a step is `{k, name, title, enabled, current, past, count, loud}`; a loud count is the amber badge<br>`SearchField({value, onChange, placeholder?, label?, inputRef?})`<br>`Lozenge({label})`, `LozengeButton({lead?, count?, word?, pressed?, title?, onClick?})`, `LozengeDivider` |
| `overlays/` | `useMenu(build?)` returns `{menu, isOpen, openAt(x, y, opts), openFrom(el, opts), close}`. Render `{menu}` yourself. An item is `{label, run, sc?, checked?, disabled?, glyph?, data?}`, `{sep: true}` or `{head}`. `glyph` is a node before the label. `useMenu<D>(build?, {onHighlight?, vimKeys?})`: `onHighlight(item \| null)` hears the highlighted action (read `item.data: D` to tell which), `vimKeys` adds j / k.<br>`usePopover(delay)` returns `{popover, show(el, node, {sticky?, placement?}), hide, toggle, close}`. A press on the trigger closes a sticky popover and the click after it does not reopen it.<br>`Legend({rows})`<br>`Sheet({title, subtitle?, footer?, onClose})` opens inside the pane.<br>`HelpButton`<br>`useToast()` returns `{toast, status}`. |
| `table/` | `OutlineTable({label, columns, minWidth?, header, flat?, menuing?, activeId?, onKeyDown?, tableRef?})`<br>`HeaderCell({sortKey?, sort?, onSort?, align?, tip?, tier?, ranked?})`<br>`RowGroup`, `GroupRow({id, label: ReactNode, count?, expanded, selected?, onSelect?, onToggle?, onContextMenu?})`<br>`Row({id, selected?, alt?, stale?, muted?, level?, onSelect?, onActivate?, onContextMenu?})`<br>`Cell({align?, indent?, data?})`<br>`useSort({initial, defaultDir?})`<br>`useRowNavigation({...})` returns `onKeyDown`.<br>`model/`: `sortItems`, `compareValues`, `navigate`, `px`, `repeatPx`, `minWidth`. |
| `status/` | `TierMark({tier, stale?})`, `TierChip({tier})`<br>`NeedsYouBadge({count?, label?, variant: live\|last-known\|group, small?, showZero?, title?})`: `label` shows text (a picked gap's id) instead of the count and is always drawn<br>`StateGlyph({state})`<br>`chip/Chip({tone, compact?, push?, title?})`, tone is plain, invariant, neutral, ok, bad, accent, pending, lag, you or unknown; `compact` is the 16 px table-cell size<br>`chip/HonestyChip({kind: seeded\|simulated\|unknown\|stale, age?})` for the dashed honesty marks<br>`FeedAge({ageSec, ok, error?})` |
| `viz/` | `StageTicks({rungs})`, `StageMeter({rung, showNumber?, deep?})`: `deep` draws the lit bars green (R3 and above)<br>`ProofBar({proofs, block?})`<br>`RungGlyph({tier, ceiling, compact?})`<br>`DayStrip({clean, days?, revertedToday?})` |
| `inspector/` | `InspectorHeader({title, icon?, sub?, path?})`<br>`InspectorSection({title, aux?, open?, defaultOpen?, onOpenChange?})`<br>`KeyValue({rows})`<br>`CommandBlock({commands, label?, prompt?})`: a line is a string (a command, with a "$"), `{code, note?}` (a dim note after the command) or `{note}` (a dim comment line); `prompt={false}` drops the "$"<br>`blocks/DiffBlock({file?, lines, label?})`, `lines` are `[mark, text]` pairs (`blocks/diff.ts` has the types and `parseDiff` for "+ x" strings)<br>`blocks/Stats({cells: {n, label, tone?}[]})`: big numbers over small words<br>`UntrustedText({source?})` |
| `shell/` | `BottomDrawer({title, count, hint?, closeLabel, onClose, compact?})`: a titled panel docked under a pane, with a lit count pill, a hide button and a scrolling live body (the content is the screen's)<br>`dock/CommandDock({line, title?})`, `dock/DockKey({optional?})`, `dock/DockText({tone: prompt\|note})`: the strip docked at the bottom of a `position: relative` pane, with the exact line the next key runs and the key hints (the optional ones go first under 820 px)<br>`fallback/ErrorView({error, retry})`, `fallback/NotFoundView()`: the views behind `app/error.tsx`, `global-error.tsx` and `not-found.tsx`. They depend on no provider and show no data. Next 16 hands the error boundary `retry`, not `reset`. |
| `surface/` | `Card`: a quiet raised tile; layout is the caller's `className` |
| `icons/` | `Icon({name, label?})` |

## Conventions

- **Stale rows.** Put `stale` on a `Row` and the tier marks, proof bars and stage ticks inside it
  dim themselves. Put `data` on body cells to get the hatching.
- **Tier colour.** Add `data-tier="hands_off"` (or any other tier) to an element and it gets the
  CSS variable `--tc`.
- **Sizes.** Fixed sizes are written as `calc(Npx * var(--ui-scale))`. Heights come from
  `--row-h`, `--ctl-h`, `--seg-h`, `--mini-h` and `--chip-h`. Type comes from `--t-body`,
  `--t-head` and `--t-small`.
- **Escape.** `Popover` and `Sheet` handle Escape first, so `useHotkeys` won't also act on it.
- **Data.** Read demo data from `@/lib/demo` (typed). Tier metadata is in `@/lib/tiers`.
