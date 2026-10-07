# engine - Belay's model-free proof engine, tier gate and tripwire

Runs in GitLab CI as `npx tsx engine/cli.ts <cmd>` (or `npm run engine -- <cmd>`). No network, no LLM, no
dependency beyond `yaml`. Every command writes JSON to stdout and a human summary to stderr. Exit codes:
**0** pass, **1** fail, **2** inconclusive or error (an error prints `{"error": "..."}`).

| Command | Does | Exit |
|---|---|---|
| `prove --class <ProofClass> --input <file.json> [--policy P] [--files-root D]` | Writes a `ProofBlock` | verdict: 0 / 1 / 2 |
| `envelope --policy P --class <id> --diff <file> [--env <name>]...` | Files, lines, denied paths, environments | 0 within, 1 outside |
| `gate --policy P --state S --class <id> --proof F --guardrail F [--agent A] [--diff F] [--env E] [--engine-sha H]` | `merge` / `approve` / `wait` / `block` | 0 / 0 / 2 / 1 |
| `tripwire --policy P --state S --event F` | `{demote, commit: {path, content, message}}` | 0 (2 on bad input) |
| `ledger append --event F --chain events.jsonl [--write]` | One hash-chained ledger line | 0 (2 on a broken chain) |

Policy defaults to `policy/trust-policy.yml`, state to `policy/tier-state.yml`. In a proof input,
`{"$file": "x.diff"}` is replaced by that file's text (relative to the input). The file must resolve, symlinks
followed, under the input's folder or `--files-root`, and not into a `.git` folder: the text is posted on the MR.
Only `prove` inlines; `gate`, `tripwire` and `ledger` read their JSON as it is.

## What each proof class proves

- **exploit-test** - the named test failed at base and its output names the vector; the same test id passed at
  head; no test was weakened in the diff (assertions removed or loosened, skips, deleted tests, `assertTrue(true)`);
  the finding is gone on a rescan by the same scanner version; the diff is inside the envelope. Reads JUnit XML,
  or a raw job trace (Gradle, Surefire, pytest, go test, Jest/Vitest).
- **cited-diff** - every finding quotes text that literally sits in a hunk of the MR diff, compared after
  collapsing whitespace only. It proves the quote exists, not that the finding reads it right. Diff text is data.
- **rerun-stats** - N reruns of one SHA, counts recomputed from the job records (cancelled and runner failures
  left out): `flake` below the real-failure rate, `real-failure` at or above it. Thresholds come from a
  `rerun_stats` block in the policy, else the engine defaults (5 runs, 0.8), and the check says which.
- **linked-evidence** - every statement's link resolves in the resolution results the input carries (the engine
  never fetches), on an allowed host; CRA clock arithmetic is recomputed. Legal wording is a `decidedBy: human` check.
- **repro, bench-delta, score-delta, ledger-record** - stubs: `inconclusive: not implemented`, exit 2.

The block's `verdict` is `verdictOf(checks, envelope.within)`: claims never decide. `engine` is
`{version, sha256}`, the hash of every engine source file (tests and fixtures excluded), so a verdict pins its checker.

## Gate and tripwire

The gate fails closed. Effective tier is the lower of the recorded tier and the class ceiling (a lapsed
hands-off lease counts as supervised). Quarantined or a guardrail block gives `block`. A proof that failed, whose verdict does
not follow from its checks, or of the wrong class gives `block`; an inconclusive or missing proof or guardrail gives
`wait`. Then hands-off `merge`, supervised `approve` (a human still merges), assisted `wait`. The tripwire
only lowers a tier with `demote()`, edits `tier-state.yml` in place (comments kept), and never promotes.

## Sustainability

D6: verification costs no model calls. Every check here is a parser, a string comparison or arithmetic, so
re-deriving a Proof Block takes milliseconds of CPU rather than an LLM-as-judge call per claim.

Fixtures live in `__fixtures__/` (`[R]`: Gradle JUnit and trace shapes are recalled, not recorded from a live runner).
Run `npx vitest run engine`.
