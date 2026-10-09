# Theater (F7)

Route `/theater`. A film replayed as one change climbing the nine holds of the loop. Ported from the approved "The
Pitch" prototype. Two films, chosen by the loader (`data/loadTheaterData.ts`, on the server):

- **The real film**: when the data source's `getLedger()` (the deep project's hash-chained belay-ledger events) names
  at least one MR, Theater plays them, one take per MR. The first take is the newest MR (by its last event's seq) that
  has a `merged` event, else the newest MR; the rest follow newest first. Events about anything but an MR are not filmed.
- **The illustrative film**: with no MR in the ledger, and always in demo mode (the demo source's ledger is empty):
  the invented slice seq 480-520 (`data/ledger.ts`), always marked REPLAY.

## Parts
- `TheaterScreen.tsx` composes the Window: toolbar transport, sidebar takes and marks, stage, inspector,
  status line, "?" legend. Present mode moves the stage to a fixed full-viewport layer (`F`, `Esc`).
- `components/stage/` stage, four answers, pitch, closing board. `wall/` the rope, holds, climbers and the
  riding caption. `rail/` autonomy chips, stages with evidence, CRA clock. `chrome/` transport, takes
  sidebar, status line, help. `inspector/` the current beat (and a real event's facts). `parts/` ReplayChip.
- `hooks/` the store and its frame clock (`useReplayStore`), slice subscription, present mode, keys, actions.

## Model (pure, tested)
- `model/film/` `fromLedger.ts`: `entriesOf` (one MR's events -> entries) and `ledgerFilm` (the takes); `holds.ts`: the
  real film's nine holds and the kind-to-hold table; `who.ts` names an entry's actor or agent. It imports only types
  from `@/schemas/ledger` (which imports `node:crypto`); the loader maps on the server and hands the client plain data.
- `model/replay/` reducer (seq/beat/take/in-out/loop/pre-roll), state helpers and readouts, tiny store. The state
  carries its reel (the film's entries and takes), so one reducer plays either film.
- `model/derive/` snapshots (the fold over the film), the four answers, motion (`climb.ts`), clock text. The
  illustrative film folds once from `INITIAL`; a real film folds each MR from `EMPTY`.
- Frame state depends only on (entry, film time), so a take replays exactly. `#seq=NNN` cues a take, paused.

## The real film
Each entry states only what its event states: at, agent, kind, action_class, tier_at_time, verdict when present, the
MR iid, seq, and a 12-digit hash prefix. It starts from an empty state: no counts, tiers, rungs or needs. A kind moves
the climber only to the hold that the kind is; a hold the ledger does not reach stays unclimbed (only reached holds
are drawn done, and there is no lit rope).

| Kind | Hold | Why |
|---|---|---|
| `task_started` | none | work began; no hold is reached yet |
| `proof_verdict` | 4 Proof Block | the proof engine's verdict |
| `guardrail_verdict` | 5 Guardrail | the guardrail's verdict (the entry carries `pass` or `block`) |
| `tier_decision` | 6 Tier gate | a tier decision (a gate's, or a tripwire's demotion) |
| `merged` | 6 Tier gate | the gate's outcome: the change merged |
| `deployed` | none | the event does not say which environment, so neither 7 Staging nor 8 Production |
| `outcome` | none | no hold of the climb |
| `clock_event` | none | no hold of the climb |

What the ledger does not feed is hidden, never invented: the rungs (Stages with evidence) and the closing Board, the
CRA clock, the catalogue's three autonomy classes (the rail shows instead the classes the MR's events name, at the
`tier_at_time` each states), the needs (the Needs me card and section), Running and Going well, the proof checks, the
!44 line and its quote, and the loop's narrative per hold (who, what). Nothing is marked "demo" instead.

## Data
- `data/ledger.ts` REPLAY_LEDGER; `data/constants.ts` takes, who, checks, initial state, CRA anchor, keys.
- The illustrative film's catalogue parts (`TheaterDemo`: stages, tracks, rungs, the !44 quote) and its holds (the
  loop) are read by `loadTheaterData`; a real film has none (`demo: null`).

## Behaviour notes
- Reduced motion: no easing (climbs snap), no CSS animation, 1 s pre-roll. Hidden tab: the frame clock stops.
- The climber chip at beat 0 sits one bolt below hold 1 and the wall keeps room for it (prototype clipped it).
- Home/End and a looped take: any operator action cancels a pending roll or loop restart.
- Keys 1-8 cue the first eight takes; a real film with more MRs lists them all in the sidebar.

## On the shared kit
`Card` is `surface/Card`, and a take with no rolls has no count column (`SidebarItem` hides an empty count).
`parts/ReplayChip` and `chrome/Transport` (TransportButton in a Lozenge) stay local.
