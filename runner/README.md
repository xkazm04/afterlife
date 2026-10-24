# runner/ - the cycle runner

Waves of headless `claude -p` lanes in git worktrees of fleet repos. Each lane is gated, committed to
`belay/wave-<n>` only if every gate is green, and metered into an append-only run file. Nothing pushes,
merges or writes to GitLab: the wave branch is left for a person.

## Run it

```
npm run runner -- --repo athena-portable            # = belay run --repo ...
belay run --repo <slug> [--waves 1] [--lanes 6] [--lane-cap 3] [--wave-cap 25] [--model sonnet] [--fleet .belay/fleet.yml] [--skip-base-gates] [--dry-run]
```

`run` prints repo, base, caps and model before spending; `--dry-run` stops there. A flag not in that list (a
misspelt `--lane-caps`) exits 2 before anything runs. Copy `fleet.example.yml` to
`.belay/fleet.yml` (gitignored) and fix the paths. A repo's own `laneCapUsd`/`waveCapUsd` are ceilings on the flags.
`laneTools` (optional) lists extra command prefixes a lane may run, e.g. `npx vitest run`, `cargo check`.

## What each call may do

Headless `-p` denies every tool call that would prompt, so each call gets a permission profile
(`agent/permissions.ts`): `--permission-mode`, `--tools`, `--strict-mcp-config` (no MCP server) and `--settings <file>`,
a JSON file written to a fresh temp dir per call and removed after it (retried; one a just-killed child still holds
is printed, never thrown, so the call keeps its result and its cost). Rules live in that file, not argv, because on
Windows claude.cmd runs through cmd.exe with unescaped argv; the path must be a plain token (set TMP/TEMP to one).
- plan and review: tools Read, Grep, Glob only; everything else denied.
- lane: acceptEdits; Bash allowed for `Bash(<prefix>:*)` per sub-command (split on `&&` `;` `||` `|`) of `setup` and
  `gates`: the first two words, three after a launcher (`uv run ruff`, `npm run lint`), quoted args and flags cut, a
  bare launcher (`npm`, `npx`, `node`, ...) never alone; plus `laneTools`. Denied: WebFetch, WebSearch and the
  programs `git`, `curl`, `wget`, `gh`, `glab`. Read-only commands claude itself treats as safe (`ls`, `whoami`) still run.
  A lane's repair turn runs under the lane profile, with `--resume <sessionId>`.
- reflect: no tool at all (`--tools=`).

## A wave

1. `wave.start`. Branch `belay/wave-<n>` is created from `base` in its own worktree (`<repo>/.claude/worktrees/belay-wave-head`, one fixed path so a shared build cache is reused; lanes use `belay-wave-lane`).
   Setup and the gates run there once, on base: if any is red, every lane would fail for a reason not its own, so the
   wave ends at once (`wave.end` with `baseRed` = the reason and output tail, nothing spent, no reflect) and the run
   exits 1. `--skip-base-gates` skips this check when a person knows base is red.
2. Plan: one read-only claude call in a detached worktree of `base` (`prompts/plan.md` + repo context). It answers in
   JSON lines `{"lane","title","files","why","challenge"}`; the first `--lanes` that parse run. A plan session that
   changed its worktree is voided. Its cost is emitted as `lane.usage` with lane `plan`, then `wave.plan` records the
   answer: `raw` (lines that looked like JSON), `parsed` (items that will run), `items` (their lane ids) and, when
   the plan ran nothing regardless, `voided` (`timeout`, `error` or `dirty`). Fewer items than `wave.start.lanes`
   is a planner that under-filled.
3. Per lane, sequentially: `lane.start`; a worktree on `belay/wave-<n>-<lane>` from the wave branch tip (so it sees the lanes that landed before it, and a saved `.patch` applies to that tip); one claude call
   (`prompts/lane.md` + the item); `lane.usage`; on DONE, the review and at most one repair turn (below); then the
   fleet gates, each its own spawn, exit code asserted.
   All green: one commit `belay(wave-<n>): <title>`, cherry-picked onto the wave branch. Its body is `Why:` (the
   item's evidence), `Done:` (the lane's DONE line), `Lane:` and last a `Co-Authored-By: Claude (<model id>)
   <noreply@anthropic.com>` trailer naming the model the lane's usage reported (Ascent LESSONS 1.1: lane commits
   without an AI trailer lower the target's D7). Any red gate: nothing is
   committed, and `parkReason` is `gate red: <gate> (exit N)` followed by the last 1200 characters of that gate's
   stdout then stderr, ANSI stripped (the reflect step sees it too). A lane that changed anything and did not land
   saves its diff against base (untracked files included, `--binary`) to `<runs>/<repo>/<wave>.<lane>.patch` before
   its worktree goes; `lane.end.patch` names it relative to the runs dir. `git apply` it on base to pick the work up.
   The lane worktree and branch are always removed. `lane.end`.
   After the planned lanes, when the repo has a fleet `frontier` and the plan parsed fewer items than `--lanes`
   (or none), ONE frontier lane runs: lane id `frontier`, `lane.start` with `frontier: true`, its prompt
   `prompts/lane.md` + `prompts/frontier.md` + the objective and its metrics (ported from Ascent's
   `buildFrontierPrompt` / `frontierReportContract`, P4): choose ONE improvement toward the objective, name its
   mechanism, drop anything that needs network, a new dependency, CI, `.claude/` or an existing test. It goes through
   the same review, repair, gates and landing, under the same caps.
4. T3, for a repo with a `frontier` whose wave landed something: each metric is measured on the wave base (twice)
   and on the wave tip (twice when a metric is a wall time or its base runs differed, else once), each side in a
   throwaway detached worktree `belay-wave-tech` with `setup` run in it (never a link to the main checkout's
   `node_modules`), deleted with `removeTree` (junctions unlinked, not followed). Commands run through `runProc`
   with `childEnv()` and `timeoutMin` (default 20); a red command gives that run no value. Then `wave.tech`
   `{from, to, metrics: [{name, unit, before?, after?, gain?, threshold, breakthrough, noisy}]}`: `gain` is signed
   so positive is better, `breakthrough` = gain >= threshold, `noisy` = either side's spread ((max - min) / mean)
   >= threshold (Ascent SKILL.md's noise rule: a noisy metric is not evidence either way).
5. `wave.end`: `mergeable` = at least one lane landed AND the gates are green on the wave branch itself. `branchKept`
   is false when nothing landed and the branch was deleted (`branch` still names it; older files have no key).
6. Reflect: one claude call (`prompts/reflect.md` + the wave's events, a `wave.tech` line first under its own
   heading, and `frontier.md` when a frontier lane ran) in an empty scratch dir; its text is written to
   `.belay/runs/<repo>/<wave>.proposals.md`, its usage is emitted as `lane.usage` with lane `reflect` (after `wave.end`).

## Review and one repair turn

Ported from Ascent's archived experiment branch (`refs/hygiene-archive/2026-10-20/experiment/infinite-cycles`,
paradigm P2: cycles personas-web-006 `f6994190` and -007 `332c702f`), in `lane/review.ts`, between a lane's DONE and
its gates:
1. Integrity (`lane/integrity.ts`): an EXISTING test file (`*.test.*`, `*.spec.*`, a `tests/` dir, `test_*.py`,
   `*_test.go`, `*_tests.rs`, ...) the lane deleted, or changed beyond what `lane.md` allows, and any changed fixture,
   is put back to its base text. Allowed: a mechanical call-site update (on non-import lines, the assertion words
   removed equal those added, and every literal a removed assertion line held is still on an added line) and an
   appended line with no assertion (one registry entry). `lane.end.restored` names what was put back.
2. Review: a FRESH claude call under the review profile (Read, Grep, Glob) with `prompts/review.md`, the item
   (title, why, challenge, files), the gates, the changed paths, the lane's diff against its base (capped at 40,000
   characters; the reviewer has no shell, so no `git diff`) and `lane.md` as run. It answers in one json block,
   `{"v":1,"findings":[{file,line,check,problem,evidence}]}`; an empty list is OK. Its worktree is fingerprinted
   before and after: a review that changed it fails the lane. A review that fails or cannot be read changes nothing.
3. Repair: only when the review cited findings or a file was put back, exactly ONE turn with `prompts/repair.md` and
   the findings (`[integrity]` ones first): the lane's own session resumed (`claude -p --resume <sessionId>` with
   the lane profile, in the same worktree), or, with no session id, a fresh lane call on the lane's prompt plus the
   review. Its DONE line supersedes the first; a PARK parks the lane before any gate; no line keeps the first DONE.
4. Then the diff check and the gates run as before. `lane.end.review` is `clean`, `defects` or `unread`.

Both calls are metered as `lane.usage` on the lane's own id with `call: "review"` / `"repair"`, and count against
`--lane-cap`: a lane past its cap after the review gets no repair turn and ends `budget`. Timeouts: review 5
minutes, repair 6 (or the lane timeout, whichever is lower). `claude --resume <id>` was checked headless on CLI
2.1.306 with the runner's flags (`-p --output-format stream-json --permission-mode acceptEdits --tools=...
--strict-mcp-config --setting-sources project,local --settings <file>`): the session keeps its context and its id,
and `total_cost_usd` is the resumed call's own. The session must be resumed from the same cwd, which the fixed lane
worktree path guarantees.

## Fleet `frontier`

Optional per repo, validated strictly in `fleet/frontier.ts` (an unknown key stops the run):
`frontier: {objective, metrics: [{name, command, parse, direction, threshold, timeoutMin?}]}`, the shape of
Ascent's `techMetrics` (`.claude/skills/infinite/SKILL.md`, T3). `parse` is `{kind: wall, unit?}` (the command's wall
seconds), `{kind: json-sum, file, field, scale?, unit?}` (the sum of `field` over a JSON file's values, the file
inside the repo) or `{kind: regex, pattern, unit?}` (the first capture group of stdout+stderr; a pattern without a
group is refused). `command: null` reads what the previous metric's command left (bundle stats after a build).
`direction` is `up` or `down`; `threshold` is a fraction (0.1 = 10%), both the breakthrough gain and the noise
spread. `fleet.example.yml` has a commented example; no repo has one until the operator picks its objective.

## Removing a worktree

The runner deletes a worktree's dir itself (`fs.rm`, `rmdir /s /q` as the Windows fallback), never with
`git worktree remove --force`: git for Windows (2.43) follows a junction inside the worktree and empties its target,
e.g. a pnpm store a `setup` install linked in, and a removal that fails partway leaves an unregistered dir behind.
`fs.rm` unlinks a junction or symlink without entering it. Then `git worktree prune` drops the record; a dir that
would not go is printed to stderr. Each wave starts by deleting any `belay-wave-*` dir under `.claude/worktrees`
that git no longer lists as a worktree. Only paths under `<repo>/.claude/worktrees` are ever deleted.

## Outcomes and caps

With `diffCheck: true` on a repo, a lane whose change adds trailing whitespace, blank lines at the end of a file
or a new run of two blank lines fails before its gates run (`lane/hygiene.ts`); it reads only the lane's diff
against base, so the repo needs no formatter config.

A red gate (on base, in a lane, or on the wave branch) is rerun once before it counts: under fleet load a test
timeout is not a red. A gate green on its rerun is listed in the event's `flaky`, so a flake is seen, not hidden;
setup is never rerun.

A lane ends `landed`, `parked` (it said `PARK:`, changed nothing, or its commit conflicted on the wave branch),
`failed` (red gate, an error, or no final `DONE:`/`PARK:` line), `budget` or `timeout`. A lane whose reported cost passes
`--lane-cap` is `budget` and is not committed. A lane's cap is also never more than what the wave has left (whole
cents, rounded down; its prompt names that figure), and once the wave's running cost (plan included) reaches
`--wave-cap`, no further lane starts and the wave ends. Each lane is killed after 20 minutes (the whole process tree: `taskkill /T /F`
on Windows, the process group elsewhere) and ends `timeout`. Cost is what claude reports at the end of a call, so a cap
is enforced after the call that crossed it, not mid-stream.

## Run file

`.belay/runs/<repo>/<wave>.jsonl`: one `belay.run/0` event per line (`src/schemas/run/run.ts`), append-only, stamped with
`promptVersion` = first 12 hex of sha256 over `prompts/{plan,lane,reflect,review,repair,frontier}.md` in that order (a
missing file counts as empty). Added later, all optional or a new kind, so older files still read: `lane.usage.call`,
`lane.start.frontier`, `lane.end.review` / `restored`, and the `wave.tech` event. A lane
that reported no usage (a killed one) has no `lane.usage`. Wave numbers continue after existing `belay/wave-<n>` branches
and run files. If `prompts/<name>.md` is absent the runner uses a minimal inline fallback for that step.

## The API-key boundary

`runner/` is the only directory that may hand a model key to a process, and it never reads or logs it. claude gets
`agentEnv()` (`proc/proc.ts`): the runner's environment minus every secret-shaped variable (`*_TOKEN`, `*_SECRET`,
`*_PASSWORD`, `*_API_KEY`, ...) except its own `ANTHROPIC_*` / `CLAUDE_CODE_*` (plus `AWS_*` on Bedrock, Google
credentials on Vertex). The Bash commands a lane is allowed run as claude's
children, so they too get `agentEnv()`: claude's own credentials and no other secret. Every other child - setup,
gates, git and its hooks - gets `childEnv()`, with no secret at all:
a lane agent edits the files those children run, so anything they inherit is the agent's. `BELAY_PASS_ENV=NPM_TOKEN,...`
hands named variables through anyway (a private registry for `setup`). Env scrubbing does not stop a gate reading the
user's credential files (`~/.claude`, `~/.npmrc`): run the runner as a user that holds only what it needs. Nothing in
`src/` or `cli/` touches the key.

## Tests

`npx vitest run runner`. `test/fakeClaude.mjs` stands in for claude (set `BELAY_CLAUDE_BIN` to a `.mjs`/`.js` script to
swap the binary; behaviour is picked by the `<!-- belay:step=... -->` marker every prompt ends with: plan, lane,
review, repair, reflect); the run tests use a temp git repo with a real worktree per lane. `test/cycle/` covers the
review and repair turns, the integrity restore, the trailer, the frontier lane and `wave.tech`.

## Provenance

`prompts/sources.json` pins each vendored prompt's Ascent sources by sha256; `npm run runner:prompt-drift` (run it
from the main checkout, or pass `--ascent <path>`) fails when one moves. `review.md`, `repair.md` and `frontier.md`
come from the archive ref's blobs (`"ref": "archive"`), checked against that ref, not the working tree; a checkout
without the ref reports them UNCHECKED. On 2026-10-21 `ladder.md`, `reflect.md` and `SKILL.md` were re-pinned at
ascent@`d90aed85`: what had moved in them is T3 measurement and the frontier lane, ported here as P4 (`frontier.md`,
`tech/`, `wave.tech`) and `reflect.md`'s "read tech first" section.
