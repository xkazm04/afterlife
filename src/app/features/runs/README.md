# Runs (`/runs`)

What the runner did: every wave of every repo, its lanes, what they cost and how each ended. Read-only. The data is the
runner's own files, `.afterlife/runs/<repo>/<wave>.jsonl` (belay.run/0, `src/schemas/run/run.ts`), real local data in demo
and live mode alike, so it is not part of the `DataSource`.

- `app/(app)/runs/page.tsx` is a static shell; the screen host draws Runs (`screen/host.tsx`) and reads it over the screen stream on every visit (`screen/slices.ts`: `runs`, `readRuns()`, fast; `merges`, the desk's merge decisions, git, loopback only), because the runner appends while the page is open. The totals strip is dashes until `runs` lands (`screen/host.test.tsx`).
- `src/server/runs/readRuns.ts`: `readRuns(root = dataDirOf())` (AFTERLIFE_DATA_DIR, else `.afterlife`, or a `.belay` left from before the rename). Parses each line, skips what is not a
  valid event and counts it (`skippedLines`), notes `<wave>.proposals.md` beside the events. No `runs/` directory is no runs.
- `src/lib/runs/` (shared with src/server, which never imports src/app): pure, tested. `parse.ts` (a line -> event or
  null), `fold.ts` (events -> lanes -> a wave -> repos and totals), `types.ts`, `fixture.ts` (all five kinds, a malformed line, a running wave, a lane
  without usage). `model/format.ts` here: the figures' words (an absent one is `-`; a wave's wall is its `wave.end` stamp less its `wave.start`, `spanSec`). Absent values stay absent keys: a lane with no `lane.usage` has no tokens, cost or model, and the screen
  draws `-`, never 0. Several `lane.usage` events for one lane add up; tokens are input + output + cache read + cache write.
  A wave's cost is `wave.end`'s figure, else the sum of the lanes that reported one. `running` = `wave.start` and no `wave.end`.
- `RunsScreen.tsx`: header totals (waves, lanes, landed, tokens, spent, the skipped-lines badge when > 0), then the
  lane ledger, `components/LedgerTable.tsx`: the work a person judges is the lane, not the wave, so every lane of every
  wave is one flat, sortable row (`model/ledger.ts`): Wave (repo and number) first, then the lane's title, its outcome,
  its wave's state, why it parked or failed in words (else its commits), tokens, cost, wall. Costliest first; a header
  sorts, and a lane without usage sinks in a figure sort whichever way. Over it (`components/LedgerBand.tsx`) the outcome
  filter with counts (All, then each kind that has a lane: Landed, Failed, Parked, Budget, Timeout, Running). Enter or a
  double-click on a lane narrows the table to its wave (the band names it, its state, outcomes and cost, and "All
  lanes"); again, or Esc, shows every lane. The selection is a lane id (`model/select.ts`).
- Wave state (`model/waveState.ts`, `components/WaveState.tsx`) says no more than the data does: the run file alone
  cannot tell a wave to take from one already merged or whose branch was deleted, so a wave that ended mergeable reads
  "mergeable" only when the desk's merge decisions (`readDesk()`) name it and git was asked; "mergeable, git not asked
  yet" before the desk is read or when git could not be asked; "in its base, or branch gone" when the desk read it and
  named nothing (demo mode's desk names nothing). Otherwise running, unfinished (no `wave.end`) or not mergeable.
- Select a lane of a mergeable wave and `MergePanel` shows the commands the person runs, from the desk's merge decisions:
  `git -C <path> switch <base>`, `merge --ff-only belay/wave-<n>`, `push`, with `<path>` and `<base>` from
  `.afterlife/fleet.yml` (the slug only when the repo is not listed; when the file is invalid the panel names its error
  instead of "not in fleet.yml"). A mergeable wave git says is in its base already reads "nothing to merge". Each word of
  a command is single-quoted when it holds anything but safe characters, and a run file whose branch is not
  `belay/wave-<n>` gives no merge decision, so a pasted line never carries shell syntax from run data. Text only;
  nothing here merges, pushes or writes.
- `components/RunsEmpty.tsx`: no runs yet names `afterlife run --repo <slug>` and `.afterlife/runs/`.
