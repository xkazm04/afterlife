# Maturity (`/maturity`)

The nine-pitch crag: one route per stage, bolts are rungs, the rope climbs as far as there is evidence. Port of
the approved "Nine pitches" prototype. All data is illustrative demo data.

## Parts
- `MaturityScreen.tsx` composes the `Window`: toolbar (crag mode, Stepper, ScanMeta, Rescan), sidebar `StageList`,
  content (`Crag` over `GapsTable`), `SendSheet`, inspector, status counts.
- `components/crag/` the SVG: `Backdrop`, `Route` (rope, bolts, d0 chalk, climber, `?`), `Clip` (pickable gap tag),
  `LegendButton`. Drawn 1:1 in CSS px; strokes and labels use `--ui-scale`, geometry uses the same scale in JS.
- `components/chrome/` ScanMeta, StageList, StatusCounts (the Stepper, the rung meter and the gap badge are shared).
- `components/gaps/` the picked-gaps table. `components/sheet/` Send as you (exact commands first).
- `components/inspector/` evidence per rung, gap (diff tabs, after-merge checks), day 0, credit history.
- `hooks/` `useMaturity` (reducer + toasts), `useMaturityKeys` (arrows, P, 1-4, D/N/T, R), `useElementSize`, `useUiScale`.

## Model (pure, tested)
- `model/reducer.ts` the whole screen as one reducer; `state.ts`, `steps.ts` (stepper view), `rungs.ts`, `ctx.ts`.
- `model/flow/credit.ts` credit rules ("no lift: configured, not exercised" comes first), `commands.ts` the sent commands.
- `model/crag/` geometry and the per-route view model.

## Data
`data/` typed fixtures for the prototype's `MAT_EXTRA`: stage evidence, the four proposals (with their diffs),
credit history, meta. The shared dataset (`getMaturity()`) supplies rungs, engine, scan time and the gap list.

## On the shared kit
`Stepper` (controls/toolbar), the verdict chip is `Chip tone="ok"|"neutral"`, the rung meter is `StageMeter deep`, the
gap badge is `NeedsYouBadge label`, and Send as you uses `CommandBlock prompt={false}` with note lines.

## Not wired
Merge, pipeline run and probe are simulated (marked "simulated"); evidence links only toast where they would open.
