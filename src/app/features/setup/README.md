# Setup (`/setup`, F6)

The unlock map, ported from the approved "Unlock map" prototype. Steps 0-14 by phase, the eight
tracks in arm order and the belay doctor capabilities, joined by drawn edges. Probes move steps, MRs arm
tracks, and Belay writes only on a click, after showing the exact command. Arm and disarm go through the server's
plan and preview door (`src/server/actions`); the steps and the doctor are still simulated.

- `SetupScreen.tsx` composes `Window` (toolbar, map, inspector, status bar, legend). `app/setup/page.tsx` reads demo data.
- `components/map/` canvas, edge layer (SVG, measured from `[data-node]`), `columns/`, `nodes/`.
- `components/inspector/` default / step / track / capability panels; `parts/` dep lists, stats, probe line.
- `components/toolbar/` group menu, doctor lozenge (lights capabilities), Re-probe.
- `components/shared/` DepRow, GateRow, Spinner, CapGlyph. `SetupStatus` (progress, probe age), `SetupLegend`.
- `hooks/` `useSetupFlow` (reducer + async probes + toasts), `useArmWrite` (the planned arm/disarm MRs on screen), `useSetupView` (pick, hover, filter, Esc), `SetupContext`.
- `write/arm.ts` the round trip: `previewAction` when a track's Arm or Disarm section is in view (`parts/ArmPreview` shows the
  summary, the branch the plan creates, the commands, the `.gitlab-ci.yml` diff and, for T4, the BELAY_BOT_TOKEN notes);
  `confirmAction` with that preview's id on the click. The MR number and its address come from the confirm's answer, never
  from the demo. A track the repo does not define yet shows the server's refusal.
- `model/map/` graph closure (needs, frees), hot sets, edge paths. `model/flow/` state, reducer, probe age, wording. All pure, tested.
- `data/` the prototype constants as typed fixtures (step detail, arm needs, capability reliance, timing).

State: step `todo|human|probing|done` (done only on a probe; step 6 fails its first probe); track
`locked|ready|open|probing|armed` (arm opens an MR as you, a person merges, Belay verifies; disarm is a revert MR).
A doctor probe is stale after 2 min (amber, with its age); a never-probed group is all unknown.
Keys: Esc clears, Tab walks the map, Cmd/Ctrl+I toggles the inspector. Sizes follow `--ui-scale` (D10).

On the shared kit: `Chip` (status/chip), `Stats` (inspector/blocks) and the comment lines under a command (`CommandBlock` notes).
`shared/DepRow` and `shared/GateRow` stay local.
Also generic enough to promote: `map/useEdgeGeometry` (measure nodes for drawn edges), `map/EdgeLayer`.

Not ported: the hero heading, legend strip and per-node "why" lines (cut in the notes). Capability edges stay
illustrative. No arrow-key walk (as in the prototype).
