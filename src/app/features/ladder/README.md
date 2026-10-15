# Ladder (`/ladder`)

Port of the approved "Policy ledger" prototype: every action class by track, with its tier, the rung inside its
ceiling, the record behind it, and what you can revoke or promote. Belay writes on a click or a key, and the exact write
is always on screen first (the docked strip, the inspector's "write behind r"): the server's own preview, never a
command the screen spells.

- `LadderScreen.tsx`: composes the `Window` (`props.ts`: what the route hands it). The route (`app/ladder/page.tsx`)
  reads it on the server through `data/loadLadderData.ts`: the classes from the data source, the promotion thresholds
  from trust-policy.yml (`getPolicy()`: the checkout's in demo, the one the poll read in live), never a constant here.
- `data/`: the invented ledger the demo opens with, commit ids, the policy's revision, the words for the policy's rules,
  key rows. Plain data. In live mode the data source declares the opening history demo (`illustrative`): the opening
  head, the revision and its merge age carry the kit's `Chip` "demo", and so does every seeded ledger entry, drawn only
  while the project's own belay-ledger is empty. Live, "Who acted" and "All moves" read that chain (`ds.getLedger()`,
  mapped by `data/live/ledgerEntries.ts`: tier decisions, guardrail and proof verdicts, merges), unmarked (the chip is
  `components/chrome/DemoChip.tsx`). The class records are not demo: the poll counts the record of every class one
  agent holds. A record it did not count (a class several agents or no agent holds keeps the record the index held: on
  the demo GitLab, the seed's) is marked "not counted" beside the class name and in the inspector's promotion rule
  (`components/chrome/UncountedChip.tsx`; `data/loadLadderData.ts` sets `uncounted` on the class). The clock is the wall
  clock and the poll age counts up; a revoke's commit id is GitLab's. A class with no record says "No record yet".
  When the last poll could not read belay-policy (`getTiersStale()`), the status line marks the class tiers stale
  (`components/chrome/TiersStale.tsx`, the kit's `HonestyChip`) with the read's reason and the last good read's time,
  until a read succeeds.
- `write/revoke.ts`: the round trip with the server actions. `previewAction({kind: 'revoke-class', ...})` as soon as a
  revoke target is in view (`hooks/useRevokeWrite.ts` asks once per target); `confirmAction(intent, previewId)` on r, the
  button or a menu target, and only for a preview on screen. A target that is not on screen yet (`q`, an unhovered menu
  item) is put on screen first and nothing is sent; press again to send it.
- `write/promote.ts`: the same round trip for p, Promote and Re-admit, with Needs you's promote-class intent
  (`needs-you/write/promote.ts`). `previewAction({kind: 'promote-class', project, class, to, proposal?})` as soon as the
  class in view is eligible (`promotion()`), or quarantined (a re-admission, at Assisted); `hooks/usePromoteWrite.ts`
  asks once per class. Any other class asks for nothing and Promote stays grey with the rule's reason. `proposal` is the
  live promotion ask only while one is open; with none (closed unmerged, or never opened) the MR is still opened.
- `model/`: pure, tested logic.
  - `rules/` revoke targets, the rows a revoke moves and its ledger line, the dock line. The promotion rule itself
    (`promotion()`, its counts and words) is `src/lib/promotion/`: the poller's promotion ask reads the same one.
  - `view/` frozen sort, filters, grouping and j/k walk, the to-scale timeline, ledger queries.
  - `state/` the reducer: a revoke lands only when the server answered done. Demo: the write was simulated, its commit id
    is the demo's, and 6 s later a simulated tier-gate read settles it, with a simulated withdrawal beside it. Live: the
    commit GitLab made, pending ("Pending read") until a poll's receipt says a gated MR's tier_decision read that commit
    (`state/receipt.ts`: settled at the time the gate read it, so the who-acted rail draws the real gap). While one is
    pending, `hooks/useReceipts.ts` refreshes the route every 15 s to read a fresher snapshot; nothing is sent.
  - `enforcement/enforcement.ts` the class page's "Enforced" card (`components/inspector/sections/EnforcementSection.tsx`):
    committed <sha>; read at !N, <delay> after the commit (or "awaiting the next gated MR"); withdrawn approval or
    auto-merge on !N; and an alarm chip when a gate read the commit and still granted the old tier. Live: the poll's
    receipt (`server/poller/README.md`, "Enforcement receipts"). Demo: this session's simulated revoke, marked simulated.
- `hooks/`: data (reducer and derived rows), the writes on screen (`useRevokeWrite`, `usePromoteWrite`), actions (sends,
  toasts, timers; p in `usePromoteAction`),
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
N outputs); to Hands-off, accepted outputs, merged without edits, clean days, reverts (no incident count is recorded, so none is claimed), a mechanical proof
class (`MECHANICAL_PROOFS`: never a class the engine only stubs, `engine/proofs/stubs.ts`, so only `ledger-record`
is not met). Live, a class's track and proof class come from the demo catalogue's tracks (`illustrative.tracks`): the
Grant section, the track's header and the mechanical row computed here chip the proof class "demo"; a rule read from the
poll's ask (the policy's own proof class) does not. The human key is not a row: under the rows the rule states the promote write's precondition, "a person merges
this MR; Belay never merges it" (`HUMAN_KEY`), as the promote preview does; no GitLab approval setting is read. Either step adds
a `cooldown` row, not met, while the record's `cooldown_until` (tier-state.yml, stamped by the tripwire or a revoke) is
ahead: the class is not eligible before that date. Where each counter
comes from is the poller's table. A record that does not state a counter (the demo fixture states no guardrail blocks
and no window) reads it not recorded. When the poll
found a class eligible it opened a promotion ask in Needs you, and the route attaches that ask to the class (`data/loadLadderData.ts`):
the class reads eligible with the ask's counts. p, Promote or Re-admit confirms the policy MR the server planned
(`write/promote.ts`), and only while it is on screen: the class page shows it whole under "Promote · policy MR a person
merges" (the revoke beside it under "Revoke · direct commit"); on the list the dock shows one write, so the first p on
an eligible class puts the promotion on the dock and sends nothing (a quarantine, with nothing to revoke, shows its
re-admission at once), and r there puts the revoke back first. Its diff is tier-state.yml's new record, `lease_expires`
from `grant_ttl_days` for Hands-off. Done names the MR from the server's answer, with "Open !iid ↗"; a demo answer is
simulated and says so. A person merges it in GitLab; Belay never does. A greyed Promote names the first rule that is
unmet or not recorded, in its tooltip and on p, and asks the server for nothing.

Keys: j k move, r revoke one step, q quarantine, p promote (or re-admit), Enter rule and write, 1-5 / 0 tier filter, / search,
? keys and legend, Esc closes. Arrows, Home/End, Enter and the menu key act on the focused table.

## On the shared kit

The menus are the shared `useMenu` (a `glyph` per item, `onHighlight` previews the write in the dock, `vimKeys`);
`chrome/TierFilter` is a `SegmentedControl` with node labels and counts; the pending and lag chips are `Chip compact`;
Re-admit is a `Button` that sends p's write; the dock is `CommandDock`; the diff under the commands is `DiffBlock`; the group rows
pass a node label (the track id in the accent colour). `inspector/log/Axis` (to-scale timeline) stays local.

## Not ported / differences

- The legend `?` lives in the dock (as in the prototype), not the status bar; `Window` gets no `help`.
- Toast sits at the shared offset, not above the dock.

Last move after a tripwire names the trigger that fired: the poll stores the tier record's `reason` as the move's note, the
index view writes `4 min ago · tripwire · guardrail_high`, and `loadLadderData` words it (`displayLastMove`,
`src/lib/promotion/trigger/`) for the list, the class page and the Grant section. Only the six `DemotionTrigger`s are worded;
a missing or unrecognised reason reads "trigger not recorded" and none is guessed.
