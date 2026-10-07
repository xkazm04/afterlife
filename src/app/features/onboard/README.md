# Onboard (`/onboard`)

A company's GitLab estate brought into Afterlife as a **funnel**, a batch at a time:
**Discovered → Baselined → Paired → Watching → In cycles**. Setup (`/setup`) is the deep, one-project path; Onboard
is the estate-wide machine that moves every project along it with as few clicks as possible.

## The rules
- **Reads run on their own.** Day-0 scans and first polls write nothing; a batch runs every one of them.
- **Writes go as you, capped.** A bootstrap MR (pairing) or an arm MR (first cycle) is opened with your glab login,
  after the exact commands (the batch sheet), at most N per batch (5, 10 or 20).
- **Only you** merge MRs and mint project tokens; those wait in their own list and Afterlife never does them.
- **Only a probe moves a project on.** A write leaves the project where it is, waiting for its merge.
- A stale feed (expired project token) counts as paired, never as watching. Unknown baselines are unknown, not zero.

## Parts
- `OnboardScreen.tsx` composes the `Window`: toolbar (writes per batch, Preview batch), sidebar `OnboardSidebar`
  (scope: the estate or one group), content (`Funnel`, `GroupBars`, `Baseline`, `BatchTable`), `BatchSheet`,
  `OnboardInspector` (how onboarding works, or `ProjectPanel` for a picked project), `OnboardStatus`, `OnboardLegend`.
- `hooks/useOnboard` the run state (simulated), batch size and scope, selection, step filter, sheet.
- `data/loadOnboardData` reads the fleet through the data source.

## Model (pure, tested)
- `model/funnel.ts` `stepOf`, `funnel` (cumulative counts), `byGroup`, `baseline` (stage x rung over the estate,
  unrated counted), `weakest` (the natural theme of the estate's first cycles).
- `model/batch.ts` `nextAction` (one per project, with exact commands), `planBatch` (yours / reads / capped writes:
  bootstraps for the best-baselined first, first cycles for the weakest first), `runBatch`, `resolve`.
- `model/build.ts` `initialRuns`: fx-rates already waits for the merge of its bootstrap MR !2; stale projects wait
  for a renewed token.

## Not wired
Runs and re-probes are simulated and say so; live mode reads the same fleet. The commands are what would run.
