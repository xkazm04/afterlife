# Theater (`/theater`)

> What does one change look like as it climbs the whole loop, from finding to production, with proofs and a caught fault along the way?

## What it does
- Replays a recorded ledger slice (seq 480-520, 41 entries, illustrative) as the `!41` patch climbing nine holds:
  finding, red test, patch and Proof Block, guardrail and merge, staging and QA, production and summary, then the
  closing nine-stage board.
- Runs a seeded side line: the `!44` dependency bump is caught by the guardrail (a hidden instruction quoted from an
  upstream changelog), its bench-delta proof is BLOCKED, and the tripwire drops `patch-bump` to quarantined at seq 510
  while `!41` stays HANDS-OFF.
- Shows four answers on the stage (Running, Doing now, Going well, Needs me), a rail with autonomy chips for three
  classes, stages with evidence and the CRA early-warning clock, and an inspector for the current beat (checks, ledger
  lines, needs).
- Acts as a film transport: eight takes (keys 1-8), roll with pre-roll, loop, in/out marks, step and seek, a takes
  sidebar with roll counts, and a present mode that moves the stage to a full-viewport layer.
- Keeps an address: the playhead writes `#seq=NNN`; opening `#seq=NNN` (or `?seq=NNN`) shows that entry's settled
  frame, paused.

## How it works
- `app/theater/page.tsx` calls `loadTheaterData()`, which reads stages, tracks (armed / total), the loop, maturity
  rung names and rungs, and the `!44` quote from the task list through `getDataSource()`. These arrive as
  `TheaterDemo`.
- `data/ledger.ts` holds `REPLAY_LEDGER`: entries with `seq`, clock time, actor (`T1`-`T8`, `scanner`, `engine`,
  `deploy`, `belay`), text, scene, dwell, and optional effects (`beat`, `rung`, `check`, `pass`, `fail`, `dem`,
  `tier`, `need`, `board`, `seeded`, `quote`). `data/constants.ts` holds takes, actor names, the five checks of `!41`,
  the initial tiers and rungs, the CRA anchor and the key list.
- `model/derive/snapshots.ts` `buildSnapshots` is one pure fold over the slice that produces a snapshot per entry
  (beat, counts, needs and oldest-need age, tiers, rungs, checks, board, `droppedNow`, stages with evidence at rung 2
  or above). Seeking is an array lookup.
- `model/derive/answers.ts` derives the four answers; `needsIncreased` pulses Needs me only when an item is added.
  `climb.ts` computes climber positions, the `!44` fall and arrest at the guardbar, and the riding caption from
  (entry, progress) alone. `time.ts` holds clock and age text.
- `model/replay/reducer.ts` is the transport (`tick`, `seek`, `step`, `play`, `toggle`, `cue`, `roll`, `markIn/Out`,
  `toggleLoop`, `reduced`, `settled`). `model/replay/store.ts` is a small external store; `useReplaySlice` lets most
  of the screen subscribe to a `View` slice (entry, take, marks, transport) while only the wall reads every frame.
- `hooks/useReplayStore.ts` drives a `requestAnimationFrame` clock (frames capped at 100 ms, stopped while the tab is
  hidden), autoplays or cues from the URL, and mirrors the playhead into `#seq=`. `usePresent` handles F / Esc,
  optional browser full screen and an idle cursor. `useTheaterKeys` binds the keys through `useHotkeys`.

## Rules it keeps
- It is plainly a replay: an always-visible REPLAY chip, a status line starting with the replay slate, and the slice
  is marked illustrative in code and help.
- Seeded content is labelled: the `!44` take is drawn dashed in the sidebar, seeded entries carry a `seeded` honesty
  chip, and the CRA block is a seeded drill on a simulated clock.
- Untrusted text stays fenced: the `!44` quote is rendered through `UntrustedText` with its source named.
- The proof engine speaks as "proof engine · no model": the five checks (base-red, head-green, not-weakened, envelope,
  rescan) are model-free.
- Deterministic: frame state depends only on (entry, film time); the same ticks in any chunking land on the same
  frame, so a take replays exactly. Earlier snapshots are never mutated.
- Reduced motion: no easing, no CSS animation, a 1 s pre-roll instead of 2 s. Any operator action cancels a pending
  roll or loop restart.

## Code map
| Path | Role |
|---|---|
| `src/app/theater/page.tsx` | Route; renders `TheaterScreen` with `loadTheaterData()` |
| `src/app/features/theater/TheaterScreen.tsx` | Composes `Window` (transport, takes sidebar, stage, inspector, status, help) and the present layer |
| `.../theater/components/stage/` | `Stage`, `Answers`, `Pitch`, closing `Board` |
| `.../theater/components/wall/` | Rope, holds, climbers, riding caption (`Wall`, `Cap`) |
| `.../theater/components/rail/` | `Autonomy` chips, `StageRows`, `CraBlock` |
| `.../theater/components/chrome/` | `Transport`, `TakesSidebar`, `StatusLine`, `TheaterHelp` |
| `.../theater/components/inspector/` | `BeatInspector`, `BeatSection`, `ChecksSection`, `LedgerSection`, `NeedsSection` |
| `.../theater/components/parts/ReplayChip.tsx` | The REPLAY chip |
| `.../theater/hooks/` | `useReplayStore`, `useReplaySlice`, `usePresent`, `useTheaterKeys`, `useTheaterActions`, `useReducedMotion` |
| `.../theater/model/replay/` | Transport reducer, state helpers and readouts, store |
| `.../theater/model/derive/` | `snapshots`, `answers`, `climb`, `time` |
| `.../theater/data/` | `ledger.ts` (REPLAY_LEDGER), `constants.ts`, `loadTheaterData.ts` |

## Tests
- `model/replay/reducer.test.ts`: the slice is seq 480-520 in order and the takes tile it; free play by dwell;
  determinism across tick chunking; stepping and clamping; cue, roll with 2 s pre-roll (1 s reduced), marks, roll
  counts in the slate, loop with an 800 ms gap cancelled by any action, Space during a roll, the selected take
  following the playhead, a URL cue.
- `model/replay/store.test.ts`: subscribers notified on change only; the view slice is stable across film frames.
- `model/derive/derive.test.ts`: clock helpers and the CRA countdown to 19 h 12 m; snapshots (dataset start numbers, 6
  -> 7 of 9 at seq 482, five checks in order, the seq 510 demotion and re-admit item, the board from seq 519); the
  four answers and the Needs me pulse; motion (the `!41` chip stays on the pane at beat 0, the climb timing, the `!44`
  fall and arrest, the caption kept on the wall).
- `src/server/data/__tests__/parity.test.ts` includes `loadTheaterData` in the demo vs fake-GitLab parity check.

## Status and limits
- The ledger slice is fixed data in `data/ledger.ts`; the demo dataset has no ledger of its own and the screen does
  not read the real `belay-ledger` or the index ledger table.
- In live mode the props still come mostly from the demo catalogue (tracks, loop, stages); maturity rungs and the
  `!44` quote come from whatever the live snapshot holds.
- The subtitle `acme-lab / ledgerline` is hard-coded. No write paths exist on this screen.
- Full screen in present mode is optional; a browser refusal is ignored.
