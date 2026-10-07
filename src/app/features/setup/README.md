# Setup (`/setup`, F6)

The unlock map, ported from the approved "Unlock map" prototype. Steps 0-14 by phase, the eight
tracks in arm order and the belay doctor capabilities, joined by drawn edges. Probes move steps, MRs arm
tracks, and Belay writes only on a click, after showing the exact command. Arm and disarm go through the server's
plan and preview door (`src/server/actions`). Demo mode simulates the steps and the doctor; live mode reads them.

- `SetupScreen.tsx` composes `Window` (toolbar, map, inspector, status bar, legend). `app/setup/page.tsx` awaits
  `loadSetupData`: the data source's setup, tracks and classes, and in live mode `live`, what the server read now
  (`src/server/data/setup`): each track's arm block on the target's main (`checkArm`), the belay doctor
  (`probeCapabilities` on the paired group, with each row's reason and the real probe time), and steps 0 (glab's login),
  1 (the pairing row) and 4 (the target and the four belay projects). `illustrative` says what is still the catalogue's.
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
  localhost only), and a step no read observes stays unknown, "not probed". A step's write is never sent from the screen
  (Copy only). The commands name the paired group, its host and `BELAY_PROJECT` (`data/stepDetail.ts`, `stepDetailsFor`);
  demo keeps its own. The group menu offers the paired group only; no demo row or `acme-sandbox`. The step titles and
  phases and the tracks' names and arm order are the catalogue's, marked "demo" on their column heads and in the inspector.
  The shared status bar still says "illustrative demo data" in every mode (not Setup's to change).
- `model/map/` graph closure (needs, frees), hot sets, edge paths. `model/flow/` state, reducer, probe age, wording. All pure, tested.
- `data/` the prototype constants as typed fixtures (step detail, arm needs, capability reliance, timing).

State: step `todo|human|probing|done` in demo (done only on a probe; step 6 fails its first probe), `done|failed|unknown`
in live (what a read saw); track `locked|ready|open|probing|armed` (arm opens an MR as you, a person merges, Belay
verifies; disarm is a revert MR), plus `undefined` (no arm content in the repo) and `unknown` (the read failed) in live.
A doctor probe is stale after 2 min (amber, with its age); a never-probed group is all unknown.
Keys: Esc clears, Tab walks the map, Cmd/Ctrl+I toggles the inspector. Sizes follow `--ui-scale` (D10).

On the shared kit: `Chip` (status/chip), `Stats` (inspector/blocks) and the comment lines under a command (`CommandBlock` notes).
`shared/DepRow` and `shared/GateRow` stay local.
Also generic enough to promote: `map/useEdgeGeometry` (measure nodes for drawn edges), `map/EdgeLayer`.

Not ported: the hero heading, legend strip and per-node "why" lines (cut in the notes). Capability edges stay
illustrative, and demo only: a live probe row is not tied to tracks. No arrow-key walk (as in the prototype).
