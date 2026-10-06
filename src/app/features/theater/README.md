# Theater (F7)

Route `/theater`. A recorded ledger slice (seq 480-520, illustrative, always marked REPLAY) replayed as
one change climbing the nine holds of the loop. Ported from the approved "The Pitch" prototype.

## Parts
- `TheaterScreen.tsx` composes the Window: toolbar transport, sidebar takes and marks, stage, inspector,
  status line, "?" legend. Present mode moves the stage to a fixed full-viewport layer (`F`, `Esc`).
- `components/stage/` stage, four answers, pitch, closing board. `wall/` the rope, holds, climbers and the
  riding caption. `rail/` autonomy chips, stages with evidence, CRA clock. `chrome/` transport, takes
  sidebar, status line, help. `inspector/` the current beat. `parts/` ReplayChip.
- `hooks/` the store and its frame clock (`useReplayStore`), slice subscription, present mode, keys, actions.

## Model (pure, tested)
- `model/replay/` reducer (seq/beat/take/in-out/loop/pre-roll), state helpers and readouts, tiny store.
- `model/derive/` snapshots (the fold over the ledger), the four answers, motion (`climb.ts`), clock text.
- Frame state depends only on (entry, film time), so a take replays exactly. `#seq=NNN` cues a take, paused.

## Data
- `data/ledger.ts` REPLAY_LEDGER; `data/constants.ts` takes, who, checks, initial state, CRA anchor, keys.
- The demo dataset (`lib/demo`) is read by `app/theater/page.tsx` and passed in as `TheaterDemo`.

## Behaviour notes
- Reduced motion: no easing (climbs snap), no CSS animation, 1 s pre-roll. Hidden tab: the frame clock stops.
- The !41 chip at beat 0 sits one bolt below hold 1 and the wall keeps room for it (prototype clipped it).
- Home/End and a looped take: any operator action cancels a pending roll or loop restart.

## On the shared kit
`Card` is `surface/Card`, and a take with no rolls has no count column (`SidebarItem` hides an empty count).
`parts/ReplayChip` and `chrome/Transport` (TransportButton in a Lozenge) stay local.
