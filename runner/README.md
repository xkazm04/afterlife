# runner/ - the cycle runner

Waves of headless `claude -p` lanes in git worktrees of fleet repos. Each lane is gated, committed to
`belay/wave-<n>` only if every gate is green, and metered into an append-only run file. Nothing pushes,
merges or writes to GitLab: the wave branch is left for a person.

## Run it

```
npm run runner -- --repo athena-portable            # = belay run --repo ...
belay run --repo <slug> [--waves 1] [--lanes 6] [--lane-cap 3] [--wave-cap 25] [--model sonnet] [--fleet .belay/fleet.yml] [--dry-run]
```

`run` prints repo, base, caps and model before spending; `--dry-run` stops there. Copy `fleet.example.yml` to
`.belay/fleet.yml` (gitignored) and fix the paths. A repo's own `laneCapUsd`/`waveCapUsd` are ceilings on the flags.
`laneTools` (optional) lists extra command prefixes a lane may run, e.g. `npx vitest run`, `cargo check`.

## What each call may do

Headless `-p` denies every tool call that would prompt, so each call gets a permission profile
(`agent/permissions.ts`): `--permission-mode`, `--tools`, `--strict-mcp-config` (no MCP server) and `--settings <file>`,
a JSON file written to a fresh temp dir per call and removed after it. Rules live in that file, not argv, because on
Windows claude.cmd runs through cmd.exe with unescaped argv; the path must be a plain token (set TMP/TEMP to one).
- plan: tools Read, Grep, Glob only; everything else denied.
- lane: acceptEdits; Bash allowed for `Bash(<prefix>:*)` per sub-command (split on `&&` `;` `||` `|`) of `setup` and
  `gates`: the first two words, three after a launcher (`uv run ruff`, `npm run lint`), quoted args and flags cut, a
  bare launcher (`npm`, `npx`, `node`, ...) never alone; plus `laneTools`. Denied: WebFetch, WebSearch and the
  programs `git`, `curl`, `wget`, `gh`, `glab`. Read-only commands claude itself treats as safe (`ls`, `whoami`) still run.
- reflect: no tool at all (`--tools=`).

## A wave

1. `wave.start`. Branch `belay/wave-<n>` is created from `base` in its own worktree (`<repo>/.claude/worktrees/belay-wave-<n>`).
2. Plan: one read-only claude call in a detached worktree of `base` (`prompts/plan.md` + repo context). It answers in
   JSON lines `{"lane","title","files","why","challenge"}`; the first `--lanes` that parse run. A plan session that
   changed its worktree is voided. Its cost is emitted as `lane.usage` with lane `plan`.
3. Per lane, sequentially: `lane.start`; a worktree on `belay/wave-<n>-<lane>` from `base`; one claude call
   (`prompts/lane.md` + the item); `lane.usage`; then the fleet gates, each its own spawn, exit code asserted.
   All green: one commit `belay(wave-<n>): <title>`, cherry-picked onto the wave branch. Any red gate: nothing is
   committed, and `parkReason` is `gate red: <gate> (exit N)` followed by the last 1200 characters of that gate's
   stdout then stderr, ANSI stripped (the reflect step sees it too). A lane that changed anything and did not land
   saves its diff against base (untracked files included, `--binary`) to `<runs>/<repo>/<wave>.<lane>.patch` before
   its worktree goes; `lane.end.patch` names it relative to the runs dir. `git apply` it on base to pick the work up. The lane worktree and branch are always removed. `lane.end`.
4. `wave.end`: `mergeable` = at least one lane landed AND the gates are green on the wave branch itself.
5. Reflect: one claude call (`prompts/reflect.md` + the wave's events) in an empty scratch dir; its text is written to
   `.belay/runs/<repo>/<wave>.proposals.md`, its usage is emitted as `lane.usage` with lane `reflect` (after `wave.end`).

## Outcomes and caps

A lane ends `landed`, `parked` (it said `PARK:`, changed nothing, or its commit conflicted on the wave branch),
`failed` (red gate, an error, or no final `DONE:`/`PARK:` line), `budget` or `timeout`. A lane whose reported cost passes
`--lane-cap` is `budget` and is not committed. Once the wave's running cost (plan included) reaches `--wave-cap`, no
further lane starts and the wave ends. Each lane is killed after 20 minutes (the whole process tree: `taskkill /T /F`
on Windows, the process group elsewhere) and ends `timeout`. Cost is what claude reports at the end of a call, so a cap
is enforced after the call that crossed it, not mid-stream.

## Run file

`.belay/runs/<repo>/<wave>.jsonl`: one `belay.run/0` event per line (`src/schemas/run/run.ts`), append-only, stamped with
`promptVersion` = first 12 hex of sha256 over `prompts/{plan,lane,reflect}.md` (a missing file counts as empty). A lane
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
swap the binary; behaviour is picked by the `<!-- belay:step=... -->` marker every prompt ends with); the run tests use
a temp git repo with a real worktree per lane.
