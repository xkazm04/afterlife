# Maturity (`/maturity`)

The nine-pitch crag: one route per stage, bolts are rungs, the rope climbs as far as there is evidence. Port of
the approved "Nine pitches" prototype. In demo mode all of it is the demo. In live mode the rungs, day 0, engine, scan time
and each stage's one-line evidence note are the index's (the poller stores the newest `belay-maturity-scan` artifact,
`src/server/poller/README.md`), and the screen follows the repo's per-part rule (`src/server/data/README.md`): see "Live
mode" below.

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

## Live mode (`mode` from the page)
`makeCtx(maturity, stages, { mode })` leaves out, in live mode, every fixture that would pass for the project's own:
- hidden, with the real part standing in: the window subtitle is the data source's project; the scan time is the view's
  `scannedAt` (no minutes age: the view carries a clock time only), or "not scanned"; the per-rung evidence objects and
  what the next rung lacks (`data/stageEvidence.ts`) give way to the scan's own note; the Day 0 note gives way to the rung of
  the first stored scan; a simulated rescan stamps no demo clock (`data/meta.ts` `nowClock`, `scanAgeMin`, `rescanEvery`);
- hidden, nothing real to stand in: the credit history (`data/credit.ts`); Belay records none yet, and the section says so;
- marked `demo` (`components/chrome/DemoChip.tsx`, as the Ladder's): a gap's invitation, files and what it earns
  (`data/proposals.ts`, `proposalG1.ts`, `proposalG3.ts`), in the gaps table and the gap section. The live source serves
  the index's gap proposals, which only the demo seed writes today.

In every mode: Merge, the pipeline run, the probe's result, the crediting rescan, the toolbar Rescan and the credit rows
this session's rescans add are marked `simulated` (`HonestyChip`). Of the four credit checks, "same engine" and "not
detector-only" read "not checked": nothing compares two scans' engines or reads the diff. The rung meanings
(`MAT_META.rungMeans`) are the product's vocabulary, the same in every mode, and are not marked.
`labels.test.tsx` renders both modes.

## Not wired
Sending a gap is real (the server's gap door; in demo it simulates and says so). Merge and pipeline run are simulated (marked "simulated"); the probe and the rescan have no server door yet and are not sent. In live mode a gap whose files are the demo fixture is never sent (the sheet names it as demo content). A send moves no rung and records no credit: the next scan does.
