# Theater (F7)

Route `/theater`. A film replayed as one change climbing the nine holds of the loop. Ported from the approved "The
Pitch" prototype. Three films. Which one is `live/model/mode.ts` (`theaterMode`) then the loader (`data/loadTheaterData.ts`, on the server). Precedence: `?mr=N` > `?repo=R&wave=N` (the live header's replay links: the live screen shows that finished wave as it ended, from the wave data it already reads; if the payload no longer holds it, the page falls through to the replay film; `?live=0` with no wave is unchanged) > `?live=1` > a running wave > the ledger film > the illustrative film.

- **The live film** (`live/`): the runner's own belay.run/0 files (`.belay/runs`), shown as a header (running: repo, wave, lane n/m; doing what: the current lane's title; going well: landed, parked, failed, $ spent of the wave cap; needs me: mergeable waves, linking to /runs), the running lane as the hero (title, elapsed, cost so far) and a rail of the last finished lanes with outcome chips. The client polls `GET /api/runs` every 2 s while the tab is visible (paused when hidden). STALE: the newest event is over 30 s old while a wave runs; the frame freezes (elapsed stops at that event) and the badge says LIVE · STALE; it never invents motion. With `?live=1` and no wave running it shows the newest finished wave, badged LAST WAVE. The badge (LIVE, LIVE · STALE, LAST WAVE) is always visible; present mode (F, Esc) works; there is no transport, nothing to seek. `/api/runs` returns `readRuns()`'s data plus `meta` (per repo's newest wave: newest event ts, wave cap, planned lanes, each lane's start) and `generatedAt`, which the fold drops.
- **The header's replay cell** carries both the ledger film link (a bare `/theater?live=0`, always shown, even with no finished wave) and one link per finished wave (`?live=0&repo=R&wave=N`).

- **The real film**: when the data source's `getLedger()` (the deep project's hash-chained belay-ledger events) names
  at least one MR, Theater plays them, one take per MR. The first take is the newest MR (by its last event's seq) that
  has a `merged` event, else the newest MR; the rest follow newest first. Events about anything but an MR are not filmed.
  The film is capped at the 8 newest MRs (by last seq), one per take key; only the kept takes' entries go to the client.
  The cap bounds the payload, not the read: the live snapshot reads the whole ledger once per poll and the chain
  verifies from genesis, so `readLedger` stays whole and the cut is made here.
- **The illustrative film**: with no MR in the ledger, and always in demo mode (the demo source's ledger is empty):
  the invented slice seq 480-520 (`data/ledger.ts`), always marked REPLAY.
- **The submission film** (operator, 2026-10-22): the never-cut 'one scripted run of the whole loop' is filmed from `BELAY_MODE=demo` (this illustrative film), so the film never waits on the live ledgerline loop.

## Parts
- `TheaterScreen.tsx` composes the Window: toolbar transport, sidebar takes and marks, stage, inspector,
  status line, "?" legend. Present mode moves the stage to a fixed full-viewport layer (`F`, `Esc`).
- `components/stage/` stage, four answers, pitch, closing board. `wall/` the rope, holds, climbers and the
  riding caption. `rail/` autonomy chips, stages with evidence, CRA clock. `chrome/` transport, takes
  sidebar, status line, help. `inspector/` the current beat (and a real event's facts). `parts/` ReplayChip, RungSteps (the rung bar of Board and StageRows).
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
Each entry states only what its event states, through the one event-facts table (`@/schemas/chain/facts`): every key
of LedgerEvent is a row or hidden on purpose (seq and agent ride on the entry, prev_hash is the chain's), so a key the
chain gains is a typecheck error until it is described. The inspector draws the rows: kind, class, tier at the time,
verdict, environment, the tier-state revision read, what was withdrawn, what the next rung would decide, the subject,
payload, observer, at and a 12-digit hash prefix. A key the event does not state has no row. It starts from an empty state: no counts, tiers, rungs or needs. A kind moves
the climber only to the hold that the kind is; a hold the ledger does not reach stays unclimbed (only reached holds
are drawn done, and there is no lit rope).

| Kind | Hold | Why |
|---|---|---|
| `task_started` | none | work began; no hold is reached yet |
| `proof_verdict` | 4 Proof Block | the proof engine's verdict |
| `guardrail_verdict` | 5 Guardrail | the guardrail's verdict (the entry carries `pass` or `block`) |
| `tier_decision` | 6 Tier gate | a tier decision (a gate's, or a tripwire's demotion) |
| `merged` | 6 Tier gate | the gate's outcome: the change merged |
| `deployed` | by tier | the event's environment tier: `staging` is 7 Staging, `production` is 8 Production; any other tier, or an event that states none, reaches no hold |
| `outcome` | none | no hold of the climb |
| `clock_event` | none | no hold of the climb |

What the ledger does not feed is hidden, never invented: the rungs (Stages with evidence) and the closing Board, the
CRA clock, the illustrative film's three autonomy classes (one per tier: `qa.file-bug` starts Assisted and is promoted to Supervised at seq 503, `dep-bump.patch` stays Hands-off, `patch-bump` is demoted at seq 510; a promotion does not play the drop animation), the catalogue's three autonomy classes (the rail shows instead the classes the MR's events name, at the
`tier_at_time` each states), the needs (the Needs me card and section), Running and Going well, the proof checks, the
!44 line and its quote, and the loop's narrative per hold (who, what). Nothing is marked "demo" instead.

## Data
- `live/model/select.ts` (`selectLive`, `isStale`, injected clock), `mode.ts`, `meta.ts`; `live/server/livePayload.ts`; `live/hooks/useLivePayload.ts`; `live/components/`.
- `data/ledger.ts` REPLAY_LEDGER; `data/constants.ts` takes, who, checks, initial state, CRA anchor, keys.
- `loadTheaterData` keeps the films apart from live data. The illustrative film's catalogue parts (`TheaterDemo`:
  stages, tracks, rungs, the !44 quote), its holds (the loop) and its subtitle come from the catalogue (`DEMO`) only,
  in every mode: live mode never splices a real MR's quote or the index's maturity scan into the invented film. The
  real film takes nothing from the catalogue (`demo: null`); its subtitle is the source's group and deep project.
- A missing quote draws no quote box (`Cap`, `BeatInspector`), never an empty "quoted from !44 · untrusted".
- Tests (`data/readme.test.ts` fails when a test file under this folder is missing from this list):
  - model: `model/film/fromLedger.test.ts` (the mapper, the takes, the fold, the player), `model/film/holds.test.ts`,
    `model/film/takeCap.test.ts`, `model/film/takeOrder.test.ts`, `model/film/who.test.ts`, `model/derive/derive.test.ts`
    (the fold, the answers, motion), `model/replay/reducer.test.ts`, `model/replay/store.test.ts`,
    `model/replay/cue.test.ts` (the `#seq=` address a screen opens on).
  - data and screen: `data/film.test.tsx` (the screen on each film), `TheaterScreen.test.tsx` (every address miss
    is said), `data/labels.test.tsx` (the REPLAY chip and
    legend), `data/loader.test.tsx` (the loader live against a bare index and the fake group; the quote box),
    `data/constants.test.ts` (the invented constants against the ledger slice), `data/readme.test.ts` (this list).
  - live: `live/model/select.test.ts` (header facts, stale freeze with an injected clock, the precedence), `live/LiveScreen.test.tsx` (the live stage rendered), `live/server/livePayload.test.ts` (the payload off disk).
  - keys and parts: `hooks/useTheaterKeys.test.ts` (the "?" legend against the key map),
    `hooks/frameClock.test.ts` (the frame clock asks for no frames while the film is held),
    `components/chrome/TakesSidebar.test.tsx` (key hints follow MAX_TAKES), `components/chrome/Transport.test.tsx` (its
    tooltips follow the key map; the live readout speaks no glyph), `components/rail/Autonomy.test.tsx` (why a
    class sits at its tier), `components/rail/StageRows.test.tsx` (the stage and beat denominators count their lists), `components/styles.test.ts` (every `styles.x` exists in its CSS module),
    `components/inspector/Inspector.test.tsx` (the inspector counts the film's holds),
    `components/parts/PrerollCue.test.tsx`, `components/parts/RungSteps.test.tsx` (the one rung bar),
    `components/parts/Board.test.tsx` (a missing day-0 reading in words),
    `components/parts/ProofChecks.test.tsx`, `components/wall/wallFrame.test.ts` (the wall redraws only when it moves),
    `components/wall/Cap.test.tsx` (a real event's caption clock says UTC).

## Behaviour notes
- The REPLAY chip reads the same in the window and in present. The illustrative film's: "Replay · seq 480–520 ·
  illustrative" (tooltip and "?" legend: invented for the demo, never "recorded"). A real film's names its source:
  "Replay · belay-ledger · !41 · seq 1–5", the playing MR and its seq range.
- Reduced motion: no easing (climbs snap), no CSS animation, 1 s pre-roll (the "?" legend's Roll line names both
  pre-rolls, from `PREROLL_MS` / `PREROLL_REDUCED_MS` in `data/constants.ts`). Hidden tab: the frame clock stops.
- A real film's clock is hh:mm:ss in UTC (`fromLedger.ts`); `clockText` (`model/replay/state.ts`) is the one rule that
  says "UTC" after it (the status line), and the inspector's Ledger header says "· UTC" once for its column. The
  illustrative slice's clock is simulated and drawn bare.
- The transport readout carries its glyph (`●`, `▶`) apart from its words, so a live region can speak words only.
- The climber chip at beat 0 sits one bolt below hold 1 and the wall keeps room for it (prototype clipped it).
- Home/End and a looped take: any operator action cancels a pending roll or loop restart.
- Keys 1-8 cue the eight takes; a real film has at most eight (the 8 newest MRs).
- Present mode hides the toolbar, so a rolled take's pre-roll shows as a small "Rolling in n…" pill at the stage's bottom centre (`parts/PrerollCue`, from the view's `left`); gone the moment playback starts, never in normal playback, 1 s (one count) under reduced motion.
- Space, R, L and F ignore OS auto-repeat (`once` on the hotkey); the arrows still repeat when held.
- Beat 4 of the illustrative film lists the five proof checks on the stage (`stage/ProofChecks`), top right of the pitch, in the window and in present: it ticks from the snapshot's `checks` (the inspector's field), is a static labelled list (no live region), and a real film never shows it.
- `/theater?mr=N` films MR N first: the page awaits `searchParams` and the loader hands `{ mr }` to `ledgerFilm`, which puts
  that MR's take first wherever it sits in the chain (past the 8-newest cap too) and fills the other 7 slots by the
  unfocused rule. Every live Ladder move links here ("Replay !N"). An MR with no events leaves the film as it is and
  sets `film.missing`; a `#seq=` the film does not hold is `{ missingSeq }` (`model/replay/cue.ts`, `cueOf`), autoplays
  take 1 as no cue does, and is named. Either miss is said in the status bar, never played in silence as another run.
  The illustrative film has no MR and ignores `?mr=`.

## On the shared kit
`Card` is `surface/Card`, and a take with no rolls has no count column (`SidebarItem` hides an empty count).
`parts/ReplayChip` and `chrome/Transport` (TransportButton in a Lozenge) stay local.
