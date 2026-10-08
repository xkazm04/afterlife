# Setup (`/setup`, F6)

The unlock map, ported from the approved "Unlock map" prototype. Steps 0-14 by phase, the eight
tracks in arm order and the belay doctor capabilities, joined by drawn edges. Probes move steps, MRs arm
tracks, and Belay writes only on a click, after showing the exact command. Arm and disarm go through the server's
plan and preview door (`src/server/actions`). Demo mode simulates the steps and the doctor; live mode reads them.

- `SetupScreen.tsx` composes `Window` (toolbar, map, inspector, status bar, legend). `app/setup/page.tsx` awaits
  `loadSetupData`: the data source's setup, tracks and classes, and in live mode `live`, what the server read now
  (`src/server/data/setup`): each track's arm block on the target's main (`checkArm`), the belay doctor
  (`probeCapabilities` on the paired group, with each row's reason and the real probe time), and steps 0 (glab's login),
  1 (the pairing row) and 4 (the target and the five belay projects). `illustrative` says what is still the catalogue's.
- `components/map/` canvas, edge layer (SVG, measured from `[data-node]`), `columns/`, `nodes/`.
- `components/inspector/` default / step / track / capability panels; `parts/` dep lists, stats, probe line.
- `components/toolbar/` group menu, doctor lozenge (lights capabilities), Re-probe.
- `components/shared/` DepRow, GateRow, Spinner, CapGlyph. `SetupStatus` (progress, probe age), `SetupLegend`.
- `hooks/` `useSetupFlow` (reducer + async probes + toasts), `useArmWrite` (the planned arm/disarm MRs on screen), `useSetupView` (pick, hover, filter, Esc), `SetupContext`.
- `write/arm.ts` the round trip: `previewAction` when a track's Arm or Disarm section is in view (`parts/ArmPreview` shows the
  summary, the branch the plan creates, the commands, the `.gitlab-ci.yml` diff and, for T4, the BELAY_BOT_TOKEN notes);
  `confirmAction` with that preview's id on the click. The MR number and its address come from the confirm's answer, never
  from the demo. A track the repo does not define yet shows the server's refusal.
- "I merged it · verify" calls `verifyArmAction`: a read of the target's default branch. A track arms (or disarms) only when
  the read saw its block there (or saw it gone); otherwise the MR stays open with what was found (`model/flow/verify.ts`).
  Demo mode reads nothing and the track says simulated.
- Live (`model/live/`, `hooks/liveFlow.ts`, `read/reread.ts`): the opening state is the read. T4 with no block on main
  opens ready (Arm); a track with no arm content is "not defined yet"; a refused or failed read is unknown, with its reason.
  No timer probes: a step's verify ("I did it · verify", "Read again") and Re-probe call `rereadSetupAction` (read only,
  localhost only), and a step no read observes stays unknown, "not probed". A human step not read done is still yours:
  it counts in "need you", the map marks it "you", and it reads unread (or not yet), never done; "Nothing waits for you"
  only when every human step reads done and no arm MR is open (`humanGates`). A step's write is never sent from the screen
  (Copy only). The commands name the paired group, its host and `BELAY_PROJECT` (`data/stepDetail.ts`, `stepDetailsFor`);
  demo keeps its own. The group menu offers the paired group only; no demo row or `acme-sandbox`. The step titles and
  phases and the tracks' names and arm order are the catalogue's, marked "demo" on their column heads and in the inspector.
  The shared status bar still says "illustrative demo data" in every mode (not Setup's to change).
- `model/map/` graph closure (needs, frees), hot sets, edge paths. `model/flow/` state, reducer, probe age, wording. All pure, tested.
- `data/` the prototype constants as typed fixtures (step detail, arm needs, capability reliance, timing).

State: step `todo|human|probing|done` in demo (done only on a probe; step 6 fails its first probe), `done|failed|unknown`
in live (what a read saw); track `locked|ready|open|probing|armed` (arm opens an MR as you, a person merges, Belay
verifies; disarm is a revert MR), plus `undefined` (no arm content in the repo) and `unknown` (the read failed) in live.
A doctor probe is stale after 2 min (amber, with its age); a failed probe reads "probe failed HH:MM" (amber, with its
age), never as a fresh probe; a never-probed group is all unknown.
Keys: Esc clears, Tab walks the map, Cmd/Ctrl+I toggles the inspector. Sizes follow `--ui-scale` (D10).

On the shared kit: `Chip` (status/chip), `Stats` (inspector/blocks) and the comment lines under a command (`CommandBlock` notes).
`shared/DepRow` and `shared/GateRow` stay local.
Also generic enough to promote: `map/useEdgeGeometry` (measure nodes for drawn edges), `map/EdgeLayer`.

## Decisions

- Setup's subject for M2 is T4 only. The other seven tracks read "not defined yet" until each one is defined.
- Where Setup and `skills/adopt-belay` disagree, Setup's live reads decide and the skill follows. A command Setup shows must
  run, or Setup shows no command.

Known disagreements (file:line on main at 502d268; the skill is `skills/adopt-belay/SKILL.md`):

| | Step | Skill | Setup |
|---|---|---|---|
| a | all | `:17` "done when `belay doctor` says so" | doctor probes capabilities only; Setup reads steps 0, 1 and 4 itself (`src/server/data/setup/read.ts:26,107-118`) |
| b | 1 | `:28` no pairing | pairs the checkout (`data/stepDetail.ts:17`) |
| c | 5 | `:32` pairs the checkout | shows `npx belay pair` (`data/stepDetail.ts:30`); `cli/belay.mjs:29-33` does not run it |
| d | 0 | `:27` checks the GitLab version | does not (`data/stepDetail.ts:16`, `read.ts:53`) |
| e | 2 | `:29` asks for a CRA drill mode | does not (`data/stepDetail.ts:18`) |
| f | 9 | `:36` no author-cannot-approve | turns it on (`data/stepDetail.ts:48`) |
| g | 10 | `:37` Agent, then Human | human (`data/stepDetail.ts:57`) |
| h | 11, 12, 14 | | shows `flows enable`, `scan --propose`, `doctor --json` (`data/stepDetail.ts:63,67,75`); `cli/belay.mjs:26-36` runs only `doctor`, with no flags |
| i | 4 | `:31` creates belay-engine too | `DEMO_NAMES.projects` has no belay-engine (`data/stepDetail.ts:12`); the live read has it (`read.ts:22`) |

Not ported: the hero heading, legend strip and per-node "why" lines (cut in the notes). Capability edges stay
illustrative, and demo only: a live probe row is not tied to tracks. No arrow-key walk (as in the prototype).
