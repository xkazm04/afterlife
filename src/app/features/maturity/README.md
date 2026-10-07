# Maturity (`/maturity`)

The nine-pitch crag: one route per stage, bolts are rungs, the rope climbs as far as there is evidence. Port of
the approved "Nine pitches" prototype. All data is illustrative demo data.

## Parts
- `MaturityScreen.tsx` composes the `Window`: toolbar (crag mode, Stepper, ScanMeta, Rescan), sidebar `StageList`,
  content (`Crag` over `GapsTable`), `SendSheet`, inspector, status counts.
- `components/crag/` the SVG: `Backdrop`, `Route` (rope, bolts, d0 chalk, climber, `?`), `Clip` (pickable gap tag),
  `LegendButton`. Drawn 1:1 in CSS px; strokes and labels use `--ui-scale`, geometry uses the same scale in JS.
- `components/chrome/` ScanMeta, StageList, StatusCounts (the Stepper, the rung meter and the gap badge are shared).
- `components/gaps/` the picked-gaps table. `components/sheet/` Send as you: the server's preview of each gap (commands and diff) first.
- `write/` the gap door: `gap.ts` builds the stage-gap-mr intent from the proposal data (a new file as its + lines, a change to an
  existing file as a hunk the server applies to the file or refuses), asks (`previewAction`) and sends (`confirmAction(intent,
  previewId)`); `sheet.ts` is what the sheet does with those. Needs you's gap Run uses the same door.
- `components/inspector/` evidence per rung, gap (diff tabs, after-merge checks), day 0, credit history.
- `hooks/` `useMaturity` (reducer + toasts), `useMaturityKeys` (arrows, P, 1-4, D/N/T, R), `useElementSize`, `useUiScale`.

## Model (pure, tested)
- `model/reducer.ts` the whole screen as one reducer; `state.ts`, `steps.ts` (stepper view), `rungs.ts`, `ctx.ts`.
- `model/flow/credit.ts` credit rules ("no lift: configured, not exercised" comes first), `commands.ts` the send label.
- `model/crag/` geometry and the per-route view model.

## Data
`data/` typed fixtures for the prototype's `MAT_EXTRA`: stage evidence, the four proposals (with their diffs),
credit history, meta. The shared dataset (`getMaturity()`) supplies rungs, engine, scan time and the gap list.

## On the shared kit
`Stepper` (controls/toolbar), the verdict chip is `Chip tone="ok"|"neutral"`, the rung meter is `StageMeter deep`, the
gap badge is `NeedsYouBadge label`, and Send as you uses `CommandBlock prompt={false}` with note lines.

## Not wired
Sending a gap is real (the server's gap door; in demo it simulates and says so). Merge and pipeline run are simulated (marked "simulated"); the probe and the rescan have no server door yet and are not sent. In live mode a gap whose files are the demo fixture is never sent (the sheet names it as demo content). A send moves no rung and records no credit: the next scan does.
