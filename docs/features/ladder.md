# Ladder (`/ladder`)

> What autonomy tier does each action class hold, what record backs it, and what can I take away or grant?

## What it does
- Lists every action class, grouped by track (T1, T2, ...), with its tier, its ceiling, lease, record (accepted
  outputs, merged without edits, clean days, reverts) and its last move from the ledger.
- Narrows the table with the tier filter (keys 1-5, 0 for all), the sidebar (all, one track, or a smart filter: Can
  promote, Below ceiling, Leased, Quarantined, Pending read) and a name search (`/`). Sort by last move (default),
  class, track, tier, ceiling, lease or a record column.
- **Revoke** takes a class down at once: `r` one step, `q` straight to Quarantined, or "Take to…" / the split button
  for any lower tier. Restricting is free, so it is a direct commit to `belay-policy` as you. Six seconds later a
  simulated tier-gate job "reads" the commit and the pending chip clears.
- **Promote** (`p`) is greyed unless the record meets every rule; when eligible it explains that going up is a policy
  MR a person merges and jumps to `/needs-you`. A quarantined class offers **Re-admit…** in Needs you instead.
- The docked command strip always shows the exact write `r` would run (or the write of the menu item under the
  pointer). The inspector shows, per class: who acted (on a to-scale timeline), the promotion rule as counts, the
  write behind `r` (commands and `tier-state.yml` diff), the grant, and all moves filterable by actor (GitLab jobs,
  you, policy MRs, Belay polls).
- The "?" in the dock shows keys and the tier legend, and has a demo reset.

## How it works
- `src/app/ladder/page.tsx` (server) renders `LadderScreen` with `loadLadderData()`.
- `data/loadLadderData.ts` reads the DataSource: action classes, tracks, tier meanings, the cockpit poll age, the
  setup group/project for the subtitle, and the guardrail quotes of tasks by MR. It pairs them with `data/ledgerSeed.ts`
  (the invented ledger the demo opens with). `data/policy.ts` holds commit ids, the initial `tier-state.yml` head,
  the policy text and key rows.
- Pure model (`model/`):
  - `rules/tiers.ts`: `revokeTargets` (every lower rung, nearest first; none for Quarantined or Human only),
    `revokeTarget`, `nothingToRevoke`.
  - `rules/promotion.ts`: `promotion(class, proofClass)` returns `never`, `readmit`, `ceiling`, `unknown` (no record)
    or `eligible` / `notyet` with the rules as counts. Hands-off needs accepted >= needed (default 15), no-edit >= 90 %,
    14 clean days, 0 reverts and a mechanical proof class; Assisted to Supervised needs 5 accepted and 0 reverts.
  - `rules/plan.ts`: `buildPlan` (git pull, one `yq` edit per class, commit, push; and the diff), `commitText`,
    `dockCommand`. `rules/dock.ts`: `dockModel` for the strip.
  - `state/`: `ladderReducer`, `initialState`, `commitRevoke` (tier drops, lease cleared, ledger entry as you, commit
    pending) and `settleCommit` (simulated tier-gate read).
  - `view/`: `computeOrder` (frozen sort), `visibleClasses`, `tierCounts`, `buildRows` / `stepClass` (grouping and
    j/k walk), `layoutAxis` (to-scale timeline), ledger queries in `moves.ts`. `clock.ts`: simulated clock helpers.
- Hooks: `useLadderData` (reducer and derived rows), `useLadderActions` (revoke, promote, timers, toasts, reset),
  `useSimClock` (starts at 14:24:12, no `Date.now` so server and client agree), `useLadderMenus`, `useLadderKeys`,
  `useLadderPopovers`.

## Rules it keeps
- The exact write is on screen before it runs: the dock line and the inspector's "The write behind r" are built from
  the same `buildPlan` the revoke uses.
- Writes happen only on a click or a key. A revoke lowers only; there is no undo, and the status line says going back
  up is a policy MR a person merges.
- Promotion is a count, never a forecast (no ETA). Thresholds are labelled as set by `trust-policy.yml`, not measured.
- No record means "No record yet" (`unknown`), not zero; Human only is "never an agent"; Quarantined re-admits at
  Assisted at most.
- The sort order is frozen until the sort changes, so a revoke never moves rows under the cursor.
- Honesty chips in the ledger: the guardrail entry is `seeded`, the tier-gate read is `simulated`, and Belay's own
  poll shows its lag ("+12 s late"). The guardrail's quoted finding is shown as untrusted text.

## Code map
| Path (under src/app/features/ladder/) | Role |
|---|---|
| `LadderScreen.tsx` | Composes the Window, dock, popovers and inspector |
| `data/loadLadderData.ts` | Server loader through the DataSource |
| `data/ledgerSeed.ts`, `data/policy.ts` | Invented opening ledger; commit ids, head, policy text, key rows |
| `model/types.ts` | `ClassRow`, `LedgerEntry`, sort keys, `Change` |
| `model/rules/` | Revoke targets, promotion rules, the write plan, the dock line |
| `model/state/` | Reducer, initial state, commit and settle |
| `model/view/` | Sort, filters, rows, timeline, ledger queries |
| `model/clock.ts` | Simulated clock and poll age |
| `hooks/` | Data, actions, menus, keys, popovers, sim clock |
| `components/table/` | `ClassTable`, `ClassLine`, `ActionCell` (Revoke split button, Promote, Re-admit), record and last-move cells |
| `components/inspector/` | `LadderInspector`, `ClassInspector`, `GroupInspector`, `sections/`, `log/` (who acted, axis) |
| `components/chrome/` | `TierFilter`, `PolicyLozenge` |
| `components/sidebar/`, `components/dock/`, `components/help/` | Track and smart filters; the `CommandDock` line; keys, legend and policy |

## Tests
- `model/rules/tiers.test.ts`, `promotion.test.ts`, `plan.test.ts`, `dock.test.ts`: revoke targets, promotion
  counts and special cases, the yq/commit/push plan and diff, the dock preview and idle reasons.
- `model/state/reducer.test.ts`: initial state, revoke (tier, lease, pending, ledger as you, frozen rows, new commit
  ids), settle, view actions and reset.
- `model/view/sort.test.ts`, `filters.test.ts`, `rows.test.ts`, `timeline.test.ts`, `model/clock.test.ts`: frozen
  order, visibility and counts, grouping and j/k, the to-scale axis, clock helpers.
- `src/server/data/__tests__/parity.test.ts`: `loadLadderData` is the same from the live source as from demo.

## Status and limits
- Classes, tracks and tier meanings come from `getDataSource()` (`src/server/data`); the opening ledger, commit ids
  and policy text are the screen's own fixtures in both modes.
- Revoke and the tier-gate read are simulated in the browser: no `git` or `yq` runs, and the reducer state is lost on
  reload. The screen does not call the server actions in `src/server/actions`.
- Promote does not write; it hands off to Needs you. The clock is simulated.
