# Setup (`/setup`, F6)

The unlock map, ported from the approved "Unlock map" prototype. Steps 0-14 by phase, the eight
tracks in arm order and the belay doctor capabilities, joined by drawn edges. Probes move steps, MRs arm
tracks, and Belay writes only on a click, after showing the exact command. Every write is simulated.

- `SetupScreen.tsx` composes `Window` (toolbar, map, inspector, status bar, legend). `app/setup/page.tsx` reads demo data.
- `components/map/` canvas, edge layer (SVG, measured from `[data-node]`), `columns/`, `nodes/`.
- `components/inspector/` default / step / track / capability panels; `parts/` dep lists, stats, probe line.
- `components/toolbar/` group menu, doctor lozenge (lights capabilities), Re-probe.
- `components/shared/` Chip, DepRow, GateRow, Spinner, CapGlyph. `SetupStatus` (progress, probe age), `SetupLegend`.
- `hooks/` `useSetupFlow` (reducer + async probes + toasts), `useSetupView` (pick, hover, filter, Esc), `SetupContext`.
- `model/map/` graph closure (needs, frees), hot sets, edge paths. `model/flow/` state, reducer, probe age, wording. All pure, tested.
- `data/` the prototype constants as typed fixtures (step detail, arm needs, capability reliance, timing).

State: step `todo|human|probing|done` (done only on a probe; step 6 fails its first probe); track
`locked|ready|open|probing|armed` (arm opens an MR as you, a person merges, Belay verifies; disarm is a revert MR).
A doctor probe is stale after 2 min (amber, with its age); a never-probed group is all unknown.
Keys: Esc clears, Tab walks the map, Cmd/Ctrl+I toggles the inspector. Sizes follow `--ui-scale` (D10).

Kit-candidates (marked `// kit-candidate:`): `shared/Chip`, `shared/DepRow`, `shared/GateRow`, `inspector/parts/Stats`.
Also generic enough to promote: `map/useEdgeGeometry` (measure nodes for drawn edges), `map/EdgeLayer`.

Not ported: the hero heading, legend strip and per-node "why" lines (cut in the notes). Capability edges stay
illustrative. No arrow-key walk (as in the prototype).
