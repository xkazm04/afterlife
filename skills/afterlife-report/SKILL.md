---
name: afterlife-report
description: Report to Afterlife a change you propose that is meant to move a CI stage time, a pipeline run time, a local metric or a production signal of {{PROJECT}}, so Afterlife re-measures it. Use right after you propose or open such a change (a cache key, test sharding, a slow query fix).
---

# afterlife-report

Afterlife watches this repo as the project `{{PROJECT}}`. When you propose a change that is meant to make something
measurably faster, smaller or healthier, report it once with `afterlife report`. Afterlife then measures it itself, by the
next natural CI runs, by runs a person queues for it, or by a local rerun, and credits only what it measured.

## When to report

- After you propose, commit or open an MR for a change whose purpose is to move one of:
  - a CI stage's time (`ci-stage`: "Run Tests" on the `master-full` variant),
  - a whole pipeline run's time (`ci-run`),
  - a local metric the project measures (`local-metric`: one of its runner frontier metrics),
  - a production signal (`prod-signal`: `requests`, `failed-rate`, `p95-ms`, `exceptions`, `availability`).
- Once per change. Do not report refactors, features or fixes that are not meant to move a number.

## How

From any directory:

```sh
{{COMMAND}} --claim '<json>'
```

or put the JSON in a file and pass its path: `--claim claim.json`. On success it prints the stored line (with the
`id` and `at` Afterlife filled in) and exits 0. An invalid claim exits 2 and says why on stderr: fix it and run it again.
{{DATA_NOTE}}
## The claim

| Field | Required | Meaning |
|---|---|---|
| `title` | yes | One line: what the change does ("cache the npm install on package-lock.json"). |
| `target.kind` | yes | `ci-stage`, `ci-run`, `local-metric` or `prod-signal`. |
| `target.variant` | for `ci-stage`, `ci-run` | The CI variant the runs belong to ({{VARIANTS}}). |
| `target.stage` | for `ci-stage` | The stage name as the pipeline shows it ("Run Tests"). |
| `target.metric` | for `local-metric` | The metric's name. |
| `target.signal` | for `prod-signal` | One of the five signals above. |
| `direction` | yes | `down` (a time, a failure rate) or `up` (requests served, availability). |
| `ref` | yes | The change: `branch` and/or `sha` (both is best), `mr` when there is one ("!42"). |
| `expectedPct` | no | How much you expect it to move, 0 to 100. |
| `agentValue` | no | Your own figure, if you measured one. |
| `by` | no | `agent` (the default) or `person`. |

Leave `id` and `at` out: Afterlife fills them. Any other key is refused.

## Afterlife re-measures; your number never decides

Your `expectedPct` and `agentValue` are shown beside Afterlife's measurement, labelled as yours, and are never used in
the verdict. The verdict comes from Afterlife's own samples (medians, bench-delta tolerance): `credited` only when the
change measured better beyond the tolerance, `not-earned` within it or worse, `inconclusive` when too few runs or too
noisy. A claim nobody measured stays `proposed`. So report honestly and early; do not argue with the measurement.

## Worked examples

A cache key that should shorten the Run Tests stage on master:

```sh
{{COMMAND}} --claim '{"title":"cache the npm install on package-lock.json","target":{"kind":"ci-stage","variant":"master-full","stage":"Run Tests"},"direction":"down","expectedPct":20,"ref":{"branch":"feature/npm-cache","sha":"3f2a9c1"}}'
```

Test sharding that should shorten the local test run (a frontier metric of the project):

```sh
{{COMMAND}} --claim '{"title":"shard the vitest run in 4","target":{"kind":"local-metric","metric":"test wall"},"direction":"down","expectedPct":40,"ref":{"branch":"feature/shard-tests"},"agentValue":95}'
```
