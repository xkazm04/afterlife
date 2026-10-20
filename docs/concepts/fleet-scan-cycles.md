# Fleet scan cycles: plan and hand-off

State as of 2026-10-21. Belay's Life After Code submission is due **2026-10-27**. This page holds everything needed to
pick the work up on another machine. The Spark vault (`.spark/`) and `.belay/` are local and not in git; what they held
that matters is copied here.

## Goal

1. Keep Afterlife's in-app scan in step with Ascent: Ascent's cycle prompts are vendored into `runner/prompts/` from
   ascent@`3c304182`, and `npm run runner:prompt-drift` fails when Ascent's copies move.
2. Run cycles of 5-10 metered waves on each fleet repo, on a stack close to the hackathon's production stack (Claude
   through an Anthropic API key, GitLab agents later):
   - Athena Portable (`athena-portable`, its own deadline 2026-10-30 10:00 PDT, so it goes first)
   - PayPal (`paypal`, deadline 2026-11-12)
   - Gravitone (`gravitone-gcloud`)
3. What comes out: runs and metered data visible in the app (`/runs`, Theater live, Fleet, Needs you), better fleet
   repos, and Afterlife's process and cycle prompts hardened before the deadline.

## Decisions (operator, 2026-10-18 to 10-19)

| Topic | Decision |
|---|---|
| Runner | A thin rewrite of Ascent's cycle runner in `runner/`, run as `belay run --repo <slug>` from the CLI (an in-app button comes later). |
| Prompts | Vendored from Ascent, with a drift check. |
| Landing | Each lane is committed to `belay/wave-<n>`, and the person runs the fast-forward merge and the push. The runner never merges or pushes. |
| Caps | $3 per lane, $25 per wave. |
| Reflection | After each wave, the reflect call writes `<wave>.proposals.md`, and the Director applies the prompt changes by hand. |
| Model auth | The Claude CLI login was used through 10-19; from then on, `ANTHROPIC_API_KEY` (only `runner/` may read it). |
| PayPal J-3 | Kept: the quantity in the signed LISTING. There are no real buyers, so old wallets rejecting new listings doesn't matter. |
| Athena ADRs | 0121 (the gate checks nested object schemas, option A) confirmed. 0122 (unpriced-call defaults of $0.02 / $0.50) approved. |
| GitLab | Pull mirrors in `kazdanm-group`, which is on an Ultimate trial until 2026-11-05; they move to the hackathon group later. |

## What is built (Afterlife main)

- **`runner/`**: plan, then lanes in worktrees (setup, then Claude, then gates, then commit), then the wave gate, then
  cherry-pick onto `belay/wave-<n>`, then reflect.
  - Events: append-only `belay.run/0` JSONL at `.belay/runs/<repo>/<wave>.jsonl`, defined in `src/schemas/run/run.ts`.
  - Waves in one run stack on each other and see the history of earlier ones.
  - Hardened on 10-19: no secrets reach gates, setup or hooks; every child process has a lifetime ceiling and capped
    output; stopping the runner stops its lanes; a lane that edits agent or hook config is parked; a fleet base must be
    a git ref.
- **`.belay/fleet.yml`** (local, copied from `runner/fleet.example.yml`): each repo's path, base, setup and gates.
  Athena's setup must be `uv sync --extra dev`, because plain `uv sync` removes ruff, mypy and pytest.
- **Screens**:
  - `/runs`: repo, then wave, then lanes, with tokens and cost. Its merge commands use the real fleet path.
  - `/theater?live=1`: a film of the running wave.
  - Fleet: a "Cycle runner" strip above the trust table.
  - Needs you: cards for a wave to take and for a parked lane.
  - The data comes from `readDesk()` and `readRuns()` (`src/server/runs/`).
- **Smoke run**: one real wave on a scratch repo landed one lane for $0.21. It appears as the `smoke` row, "not in the
  fleet file".

## Repo state on 2026-10-21

| Repo | State |
|---|---|
| afterlife | Even with origin/main; all of the above is pushed. |
| athena-portable | Even with origin/main. The day-0 sweep, the ADR renumbering and the sync are pushed. |
| paypal | Pushed the day-0 sweep; 28 new remote commits since, so pull before wave 1. |
| gravitone-gcloud | **Not pushed.** The rebase onto the 10-19 remote finished, and the fixes for the pre-push reds are committed (`0081d6b` drives the Medium route, `5f45006` restores the mutant ratchet budget). It is 38 ahead and 39 behind origin/main (moved 10-20). Stash `pre-sync-1019` holds the working-tree edits from before the sync. |

GitLab mirrors (private pull mirrors, pipelines off): `kazdanm-group/athena-portable`, `kazdanm-group/paypal` and
`kazdanm-group/gravitone-gcloud`. The hackathon workspace is
`gitlab-ai-hackathon/transcend-october-2026/35338952`, which already holds `afterlife` and `showcase`.

## Pending steps, in order

1. **Gravitone push.**
   - `git fetch`, then rebase the 38 local commits onto origin/main and resolve conflicts on their merits.
   - Run `npm run typecheck`, `npm run lint:ratchet` and `npm test`.
   - Push through `.githooks/pre-push`. It takes up to about 3 hours, and it must not be bypassed: no `--no-verify`, no
     skip variables.
   - Check that the third red from 10-18, the stale mutant `session-cross-origin-sets-cookie` (CRLF), is gone.
   - Then decide what happens to stash `pre-sync-1019`.
2. **PayPal**: `git pull --ff-only`.
3. **Model key**: export `ANTHROPIC_API_KEY` in the shell that runs the runner.
4. **Wave 1, one repo at a time**: Athena, then PayPal, then Gravitone. Fleet runs in parallel turned gate failures
   into load timeouts on 10-18.
   - Copy `runner/fleet.example.yml` to `.belay/fleet.yml` and set this machine's paths.
   - `node cli/belay.mjs run --repo athena-portable --dry-run`, then the same without `--dry-run`.
   - Watch it in `/theater?live=1` and `/runs`. Take a mergeable wave from Needs you with the commands shown there.
5. **Reflect**: read `.belay/runs/<repo>/1.proposals.md`, apply the prompt edits worth keeping to
   `runner/prompts/*.md` (this gives prompts v2), and compare `promptVersion` across waves on `/runs`.
6. **Waves 2-10**: by Fri 10-23, Athena weighted first. Freeze the prompts and record the Theater film by Sat 10-24,
   which leaves buffer to 10-27.
7. **Later**: recreate the mirrors in the hackathon group, and run the GitLab agents there.

## Gotchas

- `glab` keeps its token in the Windows keyring. Call it from PowerShell; from Git Bash it gets a 401.
- On Athena, the journey end-to-end test fails while any old `next dev` server holds port 3001. Stop that server, or
  set `JOURNEY_PORT_OFFSET`.
- Never chain gates with `;` before a commit. Use `&&`, so that a red stops the commit.
- Under fleet load, a vitest or pytest timeout is not a red. Rerun the failing file alone before calling it real.
- Pull mirroring on gitlab.com needs Premium or above. The hackathon group's tier is not checked yet.
