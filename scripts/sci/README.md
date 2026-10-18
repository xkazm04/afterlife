# scripts/sci: energy, carbon and cost per proven MR (DECISIONS.md D6)

A model-free measurement in the Green Software Foundation's SCI form, `SCI = ((E * I) + M) per R`, where R is one
proven merge request (an MR whose pipeline ran a `belay-proof-*` job to success, or the list passed with `--proven`).
It reads an export and writes a report; it never calls GitLab.

| File | What it is |
|---|---|
| `coefficients.json` | The price and coefficient book. Every entry names its source and the date it was read |
| `jobs.mjs` | Reads a jobs export (one or several `glab api` arrays back to back, or `{ pipelines, jobs }`) into flat records |
| `rates.mjs` | Per-minute energy, embodied carbon and cost from the book, and one LLM-judge verdict |
| `sci.mjs` | `measure(jobs, book, opts)`: SCI, CI minutes, verdict comparison, minutes saved, poll reads |
| `measure.mjs` | The CLI: JSON report (`--out`) and a plain-text table on stdout |

## Live figures for ledgerline

The operator runs the export (reads only, with their own glab login), then the measurement:

```sh
P=afterlife3274741%2Fledgerline
glab api --paginate "projects/$P/pipelines?per_page=100&updated_after=2026-10-01T00:00:00Z" > ledgerline-pipelines.json
node scripts/sci/measure.mjs --list-ids --input ledgerline-pipelines.json \
  | while read -r id; do glab api --paginate "projects/$P/pipelines/$id/jobs?per_page=100&include_retried=true"; done > ledgerline-jobs.json
node scripts/sci/measure.mjs --input ledgerline-jobs.json --out ledgerline-sci.json --projects 1 --poll-hours <hours Belay ran>
```

The tripwire and sweep minutes are in the `belay-apply` project's own pipelines: export them the same way with
`P=afterlife3274741%2Fbelay-apply` (the paired group's `belay-apply`; adjust the path if it lives elsewhere) and concatenate both job files into one input (`cat a.json b.json > all.json`);
keep `--projects` at the number of watched projects, not the number in the export.

## What each number means

- **CI minutes per proven MR**: every runner-minute in the export (GitLab's job `duration`) over R. The proof layer
  (`belay-proof-*`, `belay-tier-gate`, `belay-maturity-scan`, `belay-apply-*`) is also shown alone.
- **SCI**: E is runner energy (CPU at 50% utilization, 10% and 100% as the range, plus memory, times PUE), I the grid
  intensity of `--region` (default `us-east1`, where the hosted runners run), M the runner's embodied share by vCPU.
- **Model-free against LLM-as-judge**: the same number of verdicts (proof jobs that finished success or failed), the
  engine's runner energy against a judge's inference energy, with low, central and high bounds. The judge gets no CI
  job and no embodied share, so the ratio flatters it.
- **Minutes saved**: a skipped job at the median of the same job's finished runs, a canceled one at what it had left.
  A job name that never finished in the export is listed as `unpriced`.
- **GitLab API reads**: the poller's steady-state reads per cycle (from the code, see `pollReads` in the book) times
  the cycles in the window (`--poll-hours`, else the export's first start to last finish), plus one notes read per MR
  pipeline. It is an upper bound: the next cycle starts an interval after the last one ends.
