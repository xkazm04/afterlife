# Onboard (`/onboard`)

A company's GitLab estate brought into Afterlife as a **funnel**, a batch at a time:
**Discovered → Baselined → Paired → Watching → In cycles**. Setup (`/setup`) is the deep, one-project path; Onboard
is the estate-wide machine that moves every project along it with as few clicks as possible.

## The rules
- **Reads run on their own.** Day-0 scans and first polls write nothing; a batch runs every one of them.
- **Writes go as you, capped, through the server.** A bootstrap MR (arm T6 in the project's CI: `arm-track`) or an
  enroll MR in belay-policy (first cycle: `enroll-track`) is the same server action Setup sends. The batch sheet shows
  the server's preview of each (`previewAction`), and Run confirms only a preview on screen (`confirmAction`), at most
  N per batch (5, 10 or 20). The screen never spells a write (`src/server/actions/__tests__/handwritten.test.ts`).
- **Only you** merge MRs, mint project tokens and finish a setup already under way; those wait in their own list,
  always for the whole estate (a group scope narrows only reads and writes), and Afterlife never does them.
- **Only a probe moves a project on.** A write leaves the project where it is, waiting for its merge.
- A stale feed (expired project token) counts as paired, never as watching. Unknown baselines are unknown, not zero.

## Parts
- `OnboardScreen.tsx` composes the `Window`: toolbar (writes per batch, Preview batch), sidebar `OnboardSidebar`
  (scope: the estate or one group), content (`Funnel`, `GroupBars`, `Baseline`, `BatchTable`), `BatchSheet`,
  `OnboardInspector` (how onboarding works, or `ProjectPanel` for a picked project), `OnboardStatus`, `OnboardLegend`.
- `hooks/useOnboard` the run state, batch size and scope, selection, step filter, sheet; `hooks/useOnboardWrites`
  the writes' server previews (asked once each) and their confirms.
- `write/write.ts` (tested, actions mocked) `askWrite`, `sendWrite`, `openedOf`: the round trip, as `setup/write/`.
- `data/loadOnboardData` reads the fleet through the data source.

## Model (pure, tested)
- `model/funnel.ts` `stepOf`, `funnel` (cumulative counts), `byGroup`, `baseline` (stage x rung over the estate,
  unrated counted), `weakest` (the natural theme of the estate's first cycles).
- `model/batch.ts` `nextAction` (one per project: the exact commands of a read or a person's step, the server intent of
  a write), `planBatch` (yours / reads / capped writes: bootstraps for the best-baselined first, first cycles for the
  weakest first), `runBatch` (a write moves only when the server confirmed it, under the MR GitLab named), `resolve`.
- `model/build.ts` `initialRuns`: fx-rates already waits for the merge of its bootstrap MR (looked up by branch: its
  number is not in the data); setups under way at an unrecorded step wait for you (never a second bootstrap); stale
  projects wait for a renewed token. Ordering uses the mean of rated stages only; unrated projects go last.
- Read commands follow the `belay` CLI's usage (`scan`, `doctor`); a write has no command of its own.

## Not wired
Reads and re-probes are simulated and say so; live mode reads the same fleet. Writes go through the server actions:
demo mode simulates them server side, and a project the server has not read is refused there, never sent.
