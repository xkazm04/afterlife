# Ladder (`/ladder`, `/ladder/[class]`)

> What autonomy tier does each action class hold, what record backs it, and what can I take away or grant?

## What it does
- Lists every action class, grouped by track (T1, T2, ...), with its tier, its ceiling, lease, record (accepted
  outputs, merged without edits, clean days, reverts) and its last move from the ledger.
- Narrows the table with the tier filter (keys 1-5, 0 for all), the sidebar (all, one track, or a smart filter: Can
  promote, Below ceiling, Leased, Quarantined, Pending read) and a name search (`/`). Sort by last move (default),
  class, track, tier, ceiling, lease or a record column.
- **Revoke** takes a class down at once: `r` one step, `q` straight to Quarantined, or "Take to…" / the split button
  for any lower tier. Restricting is free, so it is a direct commit to `belay-policy` as you. On a track header `q` (or
  `r`) lowers every class of the track in one commit. Demo: six seconds later a simulated tier-gate read settles it.
  Live: the commit stays "Pending read" until a poll's receipt says a gated MR read it.
- **Promote** (`p`) is greyed unless the record meets every rule; when eligible, `p` confirms the policy MR the server
  planned (a person merges it in GitLab; Afterlife never does). A quarantined class offers **Re-admit** (a policy MR at
  Assisted) the same way.
- The docked command strip always shows the exact write `r` (or `p`) would run, or the write of the menu item under the
  pointer. Enter opens the class page (`/ladder/[class]`): the promotion rule as counts, the write behind `r` and `p`
  (commands and `tier-state.yml` diff, as the server planned them), the grant, where a revoke was enforced, who acted
  (on a to-scale timeline), and all moves filterable by actor (GitLab jobs, you, policy MRs, Afterlife polls).
- The "?" in the dock shows keys and the tier legend; in demo mode it also has Reset demo.

## How it works
- `src/app/(app)/ladder/page.tsx` (server) renders `LadderScreen` with `loadLadderData()`; `src/app/(app)/ladder/[class]/page.tsx`
  renders `ClassScreen` with `loadLadderClass(id)` and the human key read back (`loadHumanKey`).
- `data/loadLadderData.ts` reads the DataSource: action classes, tracks, tier meanings, trust-policy.yml's rules
  (`getPolicy()`), the cockpit poll age, the setup group/project for the subtitle, and the guardrail quotes of tasks by
  MR. Live, the ledger is the project's own belay-ledger (`data/live/ledgerEntries.ts`); the invented opening ledger
  (`data/ledgerSeed.ts`) is drawn only while that chain is empty, marked demo. `data/policy.ts` holds the demo's commit
  ids, the opening `tier-state.yml` head, how the policy's rules are worded, and the key rows.
- Revoke and promote are the server actions' round trip (`write/revoke.ts`, `write/promote.ts`): `previewAction` as soon
  as a write is in view, `confirmAction` with that preview's id on the key or click. The screen never spells a command.
- Pure model (`model/`):
  - `rules/tiers.ts`: `revokeTargets` (every lower rung, nearest first; none for Quarantined or Human only),
    `revokeTarget`, `nothingToRevoke`, `actsFrom` (a split class acts from its highest holder).
  - `rules/promote.ts`: which promotion `p` sends (`promoteTarget`, `promoteAsk`), the write heads, the human-key lines.
    The promotion rule itself (`promotion()`: eligible / notyet with the rules as counts, or never, readmit, ceiling,
    norecord, split, untiered, unknown, nopolicy) is `src/lib/promotion/`, against trust-policy.yml's thresholds.
  - `rules/plan.ts`: `planRows` (the classes a set of changes moves) and `commitText` (the ledger line).
    `rules/dock.ts`: `dockModel` for the strip. `rules/batch/`: a whole track's changes (`trackChanges`, at most 12 in
    one write). `rules/lede.ts`: the class page's opening line.
  - `state/`: `ladderReducer`, `initialState`, `commitChanges` / `commitRevoke` (tier drops, lease cleared, ledger entry
    as you, commit pending), `settleCommit` (the tier-gate read) and `applyReceipts` (live: a poll's receipt settles it).
  - `view/`: `computeOrder` (frozen sort), `visibleClasses`, `tierCounts`, `buildRows` / `stepClass` (grouping and
    j/k walk), `layoutAxis` (to-scale timeline), ledger queries in `moves.ts`.
  - `enforcement/`: the class page's "Enforced" card. `grant/lease.ts`: the lease and no-edit bar as the policy words
    them. `clock.ts`: the screen's clock and labels. `keymap.ts`: the list's keys, declared once.
- Hooks: `useLadderData` (reducer and derived rows), `useLadderActions` (select, filter, reset, timers) with
  `revoke/useRevokeActions` (r, q, a track's write) and `usePromoteAction` (p), `useRevokeWrite` / `usePromoteWrite`
  (the writes on screen, as the server planned them), `useReceipts` (live: refresh while a revoke is pending),
  `useSimClock` (demo starts at 14:24:12, no `Date.now` so server and client agree), `useLadderMenus`, `useLadderKeys`,
  `useLadderPopovers`.

## Rules it keeps
- The exact write is on screen before it runs: the dock line shows the command the server planned for the selected
  row's revoke (`useRevokeWrite`; full command in its tooltip), and `r` confirms that same plan. A target not on screen
  yet (`q`, an unhovered menu item) is put on screen first and nothing is sent. The row moves only if the server says
  `done`.
- Writes happen only on a click or a key. A revoke lowers only; there is no undo, and the status line says going back
  up is a policy MR a person merges.
- Promotion is a count, never a forecast (no ETA). Thresholds are labelled as set by `trust-policy.yml`, not measured.
- No record means "No record yet" (`norecord`), not zero; Human only is "never an agent"; Quarantined re-admits at
  Assisted at most.
- The sort order is frozen until the sort changes, so a revoke never moves rows under the cursor.
- Honesty chips in the ledger: the guardrail entry is `seeded`, the demo's tier-gate read is `simulated`, and Afterlife's
  own poll shows its lag ("+12 s late"). The guardrail's quoted finding is shown as untrusted text.

## Code map
| Path (under src/app/features/ladder/) | Role |
|---|---|
| `LadderScreen.tsx`, `ClassScreen.tsx` | The list (Window, dock, popovers) and the class page (DetailPage) |
| `data/loadLadderData.ts`, `data/loadLadderClass.ts` | Server loaders through the DataSource |
| `data/ledgerSeed.ts`, `data/live/`, `data/policy.ts` | Opening ledger; the live chain's moves; commit ids, head, policy words, key rows |
| `write/` | The revoke and promote round trips with the server actions |
| `model/types.ts` | `ClassRow`, `LedgerEntry`, sort keys, `Change` |
| `model/rules/` | Revoke targets, which promotion p sends, the moved rows and ledger line, the dock line, a track's write |
| `model/state/` | Reducer, initial state, commit, settle and receipts |
| `model/view/` | Sort, filters, rows, timeline, ledger queries |
| `model/enforcement/`, `model/grant/`, `model/clock.ts`, `model/keymap.ts` | Enforced card, lease words, clock, keys |
| `hooks/` | Data, actions, writes on screen, receipts, menus, keys, popovers, sim clock |
| `components/table/` | `ClassTable`, `ClassLine`, `ActionCell` (Revoke split button, Promote, Re-admit), record and last-move cells |
| `components/inspector/` | `ClassDetail` (the class page's cards), `sections/`, `log/` (who acted, axis) |
| `components/chrome/` | `LadderToolbar`, `TierFilter`, `PolicyLozenge`, demo / uncounted / stale chips |
| `components/sidebar/`, `components/dock/`, `components/help/` | Track and smart filters; the `CommandDock` line; keys, legend and policy |

## Tests
- `model/rules/*.test.ts`: revoke targets, which promotion p sends, the moved rows and ledger line, the dock preview and
  idle reasons, a track's changes. The promotion counts are `src/lib/promotion/promotion.test.ts`.
- `model/state/*.test.ts`: initial state, revoke (tier, lease, pending, ledger as you, frozen rows, new commit ids),
  settle, receipts, view actions and reset.
- `model/view/*.test.ts`, `model/clock.test.ts`: frozen order, visibility and counts, grouping and j/k, the to-scale
  axis, ledger queries, clock helpers. `model/keysHelp.test.ts`: the keys behind "?" are the keys the screen binds.
- `data/*.test.ts`, `write/*.test.ts`, `components/**/*.test.tsx`: live chips, records and rules, the live chain, the
  server round trips, and the cards and cells as rendered.
- `src/server/data/__tests__/parity.test.ts`: `loadLadderData` is the same from the live source as from demo.

## Status and limits
- Classes, tracks, tier meanings and trust-policy.yml's rules come from `getDataSource()` (`src/server/data`). The
  demo's commit ids and the policy revision are the screen's own fixtures; live, the opening head, the revision and the
  seeded ledger are marked demo (`illustrative`).
- Revoke and promote go through the server actions (`revoke-class`, `promote-class`). In demo mode they plan against
  the demo group and never execute, and the reducer state is lost on reload.
- The demo's clock is simulated; live, it is the wall clock and the poll age counts up.
