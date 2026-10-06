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
- `PaneScroll({padded?})` is a scrolling pane for screens that are not tables.
- `SidebarSection({title})` and `SidebarItem({icon?, label, count?, current?, href?, title?,
  onClick?})` build sidebar content. With `href` an item is a link; without it, a filter button.

## The parts

| Folder | Components |
|---|---|
| `controls/` | `Button({variant: default\|primary\|accent\|ghost\|danger, size: md\|mini})`<br>`Kbd`<br>`Checkbox({checked, onChange, label, disabled?})`<br>`Spacer`<br>`ToolbarButton({pressed?})`<br>`PopupButton({icon?, active?})`<br>`SegmentedControl<V>({options, value, onChange, label})`<br>`SearchField({value, onChange, placeholder?, label?, inputRef?})`<br>`Lozenge({label})`, `LozengeButton({lead?, count?, word?, pressed?, title?, onClick?})`, `LozengeDivider` |
| `overlays/` | `useMenu(build?)` returns `{menu, isOpen, openAt(x, y, opts), openFrom(el, opts), close}`. Render `{menu}` yourself. An item is `{label, run, sc?, checked?, disabled?}`, `{sep: true}` or `{head}`.<br>`usePopover(delay)` returns `{popover, show(el, node, {sticky?, placement?}), hide, toggle, close}`.<br>`Legend({rows})`<br>`Sheet({title, subtitle?, footer?, onClose})` opens inside the pane.<br>`HelpButton`<br>`useToast()` returns `{toast, status}`. |
| `table/` | `OutlineTable({label, columns, minWidth?, header, flat?, menuing?, activeId?, onKeyDown?, tableRef?})`<br>`HeaderCell({sortKey?, sort?, onSort?, align?, tip?, tier?, ranked?})`<br>`RowGroup`, `GroupRow({id, label, count?, expanded, selected?, onSelect?, onToggle?, onContextMenu?})`<br>`Row({id, selected?, alt?, stale?, muted?, level?, onSelect?, onActivate?, onContextMenu?})`<br>`Cell({align?, indent?, data?})`<br>`useSort({initial, defaultDir?})`<br>`useRowNavigation({...})` returns `onKeyDown`.<br>`model/`: `sortItems`, `compareValues`, `navigate`, `px`, `repeatPx`, `minWidth`. |
| `status/` | `TierMark({tier, stale?})`, `TierChip({tier})`<br>`NeedsYouBadge({count, variant: live\|last-known\|group, small?, showZero?})`<br>`StateGlyph({state})`<br>`HonestyChip({kind: seeded\|simulated\|unknown\|stale, age?})`<br>`FeedAge({ageSec, ok, error?})` |
| `viz/` | `StageTicks({rungs})`, `StageMeter({rung, showNumber?})`<br>`ProofBar({proofs, block?})`<br>`RungGlyph({tier, ceiling, compact?})`<br>`DayStrip({clean, days?, revertedToday?})` |
| `inspector/` | `InspectorHeader({title, icon?, sub?, path?})`<br>`InspectorSection({title, aux?, open?, defaultOpen?, onOpenChange?})`<br>`KeyValue({rows})`<br>`CommandBlock({commands, label?})`<br>`UntrustedText({source?})` |
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
