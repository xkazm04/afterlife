# Ladder (`/ladder`)

Port of the approved "Policy ledger" prototype: every action class by track, with its tier, the rung inside its
ceiling, the record behind it, and what you can revoke or promote. Demo data only. Belay writes on a click or a key,
and the exact write is always on screen first (the docked strip, the inspector's "write behind r").

- `LadderScreen.tsx`: composes the `Window`. The route (`app/ladder/page.tsx`) reads the demo on the server.
- `data/`: the invented ledger the demo opens with, commit ids, policy text, key rows. Plain data.
- `model/`: pure, tested logic.
  - `rules/` revoke targets, promotion counts, the plan (yq + commit + diff), the dock line.
  - `view/` frozen sort, filters, grouping and j/k walk, the to-scale timeline, ledger queries.
  - `state/` the reducer: revoke commits, 6 s later the simulated tier-gate read settles it.
- `hooks/`: data (reducer and derived rows), actions (writes, toasts, timers), menus, keys, popovers, sim clock.
- `components/`: `table/` (class rows, split Revoke button), `inspector/` (class and track, `log/`, `sections/`),
  `chrome/` (tier filter, policy lozenge), `sidebar/`, `dock/`, `help/`, `menu/`, `common/`.

Keys: j k move, r revoke one step, q quarantine, p promote, Enter rule and write, 1-5 / 0 tier filter, / search,
? keys and legend, Esc closes. Arrows, Home/End, Enter and the menu key act on the focused table.

## Kit candidates (marked `// kit-candidate:` in the file)

`menu/` (Menu with a glyph per item and `onHighlight`), `chrome/TierFilter` (SegmentedControl with rich options),
`common/Chip` (pending and lag chips), `common/ActionLink` (Button as a link), `dock/Dock` (command strip),
`inspector/log/Axis` (to-scale timeline), the diff block in `sections/WriteSection`.

## Not ported / differences

- The legend `?` lives in the dock (as in the prototype), not the status bar; `Window` gets no `help`.
- Group rows show "T8 Upgrade gardener" in one colour (GroupRow takes a string label), no accent on the track id.
- Toast sits at the shared offset, not above the dock.
