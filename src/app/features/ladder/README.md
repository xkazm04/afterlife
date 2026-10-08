# Ladder (`/ladder`)

Port of the approved "Policy ledger" prototype: every action class by track, with its tier, the rung inside its
ceiling, the record behind it, and what you can revoke or promote. Belay writes on a click or a key, and the exact write
is always on screen first (the docked strip, the inspector's "write behind r"): the server's own preview, never a
command the screen spells.

- `LadderScreen.tsx`: composes the `Window` (`props.ts`: what the route hands it). The route (`app/ladder/page.tsx`)
  reads it on the server through `data/loadLadderData.ts`: the classes from the data source, the promotion thresholds
  from trust-policy.yml (`getPolicy()`: the checkout's in demo, the one the poll read in live), never a constant here.
- `data/`: the invented ledger the demo opens with, commit ids, the policy's revision, the words for the policy's rules,
  key rows. Plain data. In live mode the data source declares the opening history and the records demo
  (`illustrative`): every seeded ledger entry, the opening head, the revision and its merge age, and the record columns
  carry the kit's `Chip` "demo" (`components/chrome/DemoChip.tsx`). The clock is the wall clock and the poll age
  counts up; a revoke's commit id is GitLab's. A class with no record says "No record yet".
- `write/revoke.ts`: the round trip with the server actions. `previewAction({kind: 'revoke-class', ...})` as soon as a
  revoke target is in view (`hooks/useRevokeWrite.ts` asks once per target); `confirmAction(intent, previewId)` on r, the
  button or a menu target, and only for a preview on screen. A target that is not on screen yet (`q`, an unhovered menu
  item) is put on screen first and nothing is sent; press again to send it.
- `model/`: pure, tested logic.
  - `rules/` revoke targets, the rows a revoke moves and its ledger line, the dock line. The promotion rule itself
    (`promotion()`, its counts and words) is `src/lib/promotion/`: the poller's promotion ask reads the same one.
  - `view/` frozen sort, filters, grouping and j/k walk, the to-scale timeline, ledger queries.
  - `state/` the reducer: a revoke lands only when the server answered done. Demo: the write was simulated, its commit id
    is the demo's, and 6 s later a simulated tier-gate read settles it. Live: the commit GitLab made, nothing simulated.
- `hooks/`: data (reducer and derived rows), the writes on screen (`useRevokeWrite`), actions (sends, toasts, timers),
  menus, keys, popovers, sim clock.
- `components/`: `table/` (class rows, split Revoke button), `inspector/` (class and track, `log/`, `sections/`),
  `chrome/` (toolbar, tier filter, policy lozenge), `sidebar/`, `dock/` (the line of the shared `CommandDock`), `help/`.

The toast says what the answer says (`@/server/actions/words`): done (simulated in demo, else naming the commit read back
from belay-policy), failed (GitLab's answer), changed (the files moved: the new write replaces the old one on screen, nothing
ran) or refused (the reason).

A row shows the class as the index reads it (`server/index/views/standing.ts`): a tier, No record yet (no rung,
nothing to revoke, no Re-admit: Re-admit is for a real quarantine only), or Split with each holder at its own tier (a
revoke lowers every holder above the target in one commit). Unknown reads unknown.

Promotion counts: a counter a record does not know is "not recorded" and never met (`src/lib/promotion/promotion.ts`). Live, the
record columns are the record the poll counted and stored for a class one agent holds (`server/poller/README.md`, "Record
counters"): Acc, No-edit, Rv and Clean as counted, and a dim dash titled "Not recorded" for a counter nothing states
(No-edit when a counted merge has no task row that states whether anyone else pushed to it; Rv and Clean unless the
policy demotes on a revert). A class no agent holds says "No record yet". The rules are
trust-policy.yml's `promotion` block as `rulesOf` reads it: to Supervised, accepted outputs, reverts, guardrail blocks
(`guardrail_blocks`) and "counted over the last N outputs" (`window_last`: the poll counts an assisted class over its last
N outputs); to Hands-off, accepted outputs, merged without edits, clean days, reverts or incidents, a mechanical proof
class, and the human key (`human_key`: met by construction, a person merges the promotion's policy MR). Where each counter
comes from is the poller's table. A record that does not state a counter (the demo fixture states no guardrail blocks
and no window) reads it not recorded. When the poll
found a class eligible it opened a promotion ask in Needs you, and the route attaches that ask to the class (`data/loadLadderData.ts`):
the class reads eligible with the ask's counts, and p opens Needs you with that ask selected. A greyed Promote names the
first rule that is unmet or not recorded, in its tooltip and on p.

Keys: j k move, r revoke one step, q quarantine, p promote, Enter rule and write, 1-5 / 0 tier filter, / search,
? keys and legend, Esc closes. Arrows, Home/End, Enter and the menu key act on the focused table.

## On the shared kit

The menus are the shared `useMenu` (a `glyph` per item, `onHighlight` previews the write in the dock, `vimKeys`);
`chrome/TierFilter` is a `SegmentedControl` with node labels and counts; the pending and lag chips are `Chip compact`;
"Re-admit…" is `Button href`; the dock is `CommandDock`; the diff under the commands is `DiffBlock`; the group rows
pass a node label (the track id in the accent colour). `inspector/log/Axis` (to-scale timeline) stays local.

## Not ported / differences

- The legend `?` lives in the dock (as in the prototype), not the status bar; `Window` gets no `help`.
- Toast sits at the shared offset, not above the dock.
