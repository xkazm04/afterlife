# src/server/actions - operator writes (module B6)

Belay writes only on a click, as the operator's own `glab` login, and shows the exact command first. Two server actions,
`actions.ts` (`'use server'`):

```ts
previewAction(intent: unknown): Promise<ActionResponse>                   // plans; nothing runs
confirmAction(intent: unknown, previewId: string): Promise<ActionResponse> // plans again; runs only if the digest still matches
```

`confirmAction`: after a live confirm that ran its commands (done or failed) it calls `refresh()` from `next/cache`, as `repollAction` does, so the route renders again from the fresh poll; demo, refused and changed do not.

## Intents (`types.ts`; validated by `intents.ts`, which refuses anything else)

| `kind` | Fields | What the commands do |
|---|---|---|
| `revoke-class` | `project`, `changes: [{class, to}]`, `why?` | one `PUT` of `tier-state.yml` to `belay-policy`'s default branch (risk `policy`), with the file's `last_commit_id` as read. Lowers only. A revoke reaches an MR the gate already set to auto-merge at belay-apply's next sweep, which cancels that auto-merge (F74, `gitlab/apply`, 991da24); the revoke plan itself writes only `tier-state.yml` |
| `promote-class` | `project`, `class`, `to` | a branch with the new record (`start_branch` = default, `last_commit_id` as read), then a policy MR labelled `belay::promotion`. Belay never merges |
| `mark-cra-ready` | `project`, `issue` | one `PUT` of the clock work item's labels: `cra::ready-to-sign`, minus `cra::drafting`. Never submits |
| `stage-gap-mr` | `project`, `gap`, `stage`, `from`, `to`, `title`, `branch` (`belay/...`), `files: [{path, content} or {path, hunk}]` (1 to 8), `workItem?` | one commit per file on a new branch under `belay/`, then a draft MR labelled `maturity::gap`. A hunk is applied to the base file only on an exact, contiguous, single match, else `ActionRefused`; it is never written as a whole file (`plans/hunk.ts`, 775d1ab). A content file is a new file only: content for a path the base has is refused (F83, e51a17e); a new file is shown whole in the preview (F84, 1616040); the `belay/` branch must not exist yet (F85, ebaaac1); a hunk needs the base file's `last_commit_id` (F87, 42f1f26); a blank context line never matches past the final newline (F86, 105e84e); a context that matches in two places is refused at preview and at confirm (84b74e1) |
| `apply-gap-template` | `project`, `stage`, `from` (0-4, or `null`: unknown), `to` (1-4, above `from`), `template` (`GAP_TEMPLATES`) | one commit on a new branch `belay/gap-<stage>-<to>` (`start_branch` = default), then a draft MR labelled `maturity::gap` whose description names the scan's next change. The server writes the files from its catalogue (`gap/templates.ts`), never the client: `secure-includes` (secure R1: Jobs/SAST, Jobs/Secret-Detection, Jobs/Dependency-Scanning) and `package-build` (package R1: Jobs/Build) add `- template:` lines to `.gitlab-ci.yml` between `# belay:gap <stage> <template>` markers (`gap/block.ts`, `last_commit_id` as read); `plan-issue-templates` (plan R1) adds the new file `.gitlab/issue_templates/maturity-gap.md`. Refused: a template that does not earn the intent's stage and `to`, no `.gitlab-ci.yml`, a one-line or non-list `include:`, a gap block already there, a template already included (its `Jobs/` or `Security/` path), the issue template file already there |
| `arm-track` | `project`, `track` (`T1`-`T8`) | one commit of `.gitlab-ci.yml` on a new branch `belay/arm-<key>` (`start_branch` = default, `last_commit_id` as read), then one MR labelled `belay::arm`. Adds the track's include lines between `# belay:arm` markers |
| `disarm-track` | `project`, `track` | the same on `belay/disarm-<key>`: removes exactly the marked lines the arm added (their digest is in the begin marker), or refuses |
| `enroll-track` | `project`, `track` (`T1`-`T8`) | a branch `belay/enroll-<track>-<date>` with the first record of each of the track's classes (`start_branch` = default, `last_commit_id` as read), then a policy MR labelled `belay::promotion`. Belay never merges |
| `queue-runs` | `project` (a saved real project's slug), `claimId`, `pipelineId` (digits), `branch`, `n` (1-5) | `az pipelines run --org <org> --project <project> --id <pipelineId> --branch <branch> -o json`, n times, as the person's own az login (risk `low`). A failure stops the rest. The queued run ids go to `<data>/vitals/<slug>/queued.jsonl` `{claimId, runIds, at}` (not an adjustment line); the next collect from this server measures exactly those runs (method `queued`). Refused: a pipeline the project does not have, a claim it does not hold, a claim that is not ci-stage / ci-run, a CI that is not Azure Pipelines |
| `install-skill` | `project` | one file write, `<root>/.claude/skills/afterlife-report/SKILL.md` (risk `low`): `skills/afterlife-report/SKILL.md` with this checkout's `cli/belay.mjs` path, the slug, the variants and (when `BELAY_DATA_DIR` is set) the data folder filled in. The preview shows the path and the whole file (`diff`). Written only when absent or byte-identical to an earlier Afterlife install (their sha-256s in `<data>/vitals/<slug>/skill-installs.json`); a copy the repo edited is refused. Never commits |
| `enable-app-insights` | `project`, `name`, `resourceGroup`, `workspaceId` (the workspace ARM id), `site`, `slot?`, `location?` | the preview first reads the site's region (`az webapp show … --query location`; a `location` given must be it), then shows `az monitor app-insights component create --app <name> -g <rg> --location <region> --workspace <id> --kind web --application-type web -o json`, `az webapp config appsettings set -g <rg> -n <site> [--slot <slot>] --settings APPLICATIONINSIGHTS_CONNECTION_STRING=<from the create output> -o none` (risk `merge`: it RESTARTS the app, a note says so and recommends a slot first) and the component probe. The confirm reads the connection string from the create's JSON and passes it as one argv to the second command; it is never displayed, returned, stored or logged (a failed set's error is redacted). When the probe answers with an appId the project's cloud becomes `azure-app-insights` with `logs` kept |

## Setup intents (`server/start/wire.ts`; validated by `setup/intents.ts`, planned and run by `setup/`)

/start's writes on this machine. They name no project, are routed by `actions.ts` before any deps, run in every mode (demo
included: that is when they are needed) and answer only a request addressed to this machine (`local.ts`; the hosted
replay never). Preview then confirm as the project writes do (`setup/run.ts`: digest, 15-minute TTL, running and
answered memory); the preview's `mode` is always `live`, risk `low`. Every command is one `execFile` or `spawn`, never a shell.

| `kind` | Fields | What the commands do |
|---|---|---|
| `install-glab` | none | `winget install GLab.GLab --accept-source-agreements --accept-package-agreements` (Windows) or `brew install glab` (macOS), up to 10 minutes. Refused: glab already answers `--version` (as `resolveGlabBin` finds it), Linux (the install docs are named), the package manager not on the PATH |
| `glab-login` | `host?` (a hostname; `gitlab.com` is the same as none) | opens a NEW terminal window running `glab auth login [--hostname <host>]` and returns once it opened: `cmd /c start "glab login" cmd /k glab auth login ...` (Windows), `osascript` telling Terminal to `do script` (macOS), `x-terminal-emulator -e` (Linux; refused with the command to copy when there is none). Never reads a token: glab keeps it. Refused while glab is not installed |
| `set-setup` | `groupId` (digits), `mode` (`demo` or `live`), `host?`, `project?` (a project path's last segment), `proofAuthors?` (usernames, comma-separated) | writes `<data dir>/settings.json` (`env/settings.ts`, temp file and rename), then `restartRuntime()` (`data/live/runtime.ts`) in this process; the result's second outcome says the runtime's new state. The diff shows each changed setting as `- old` / `+ new`; a field left out keeps its setting. Refused: a key the env sets to another value (`AFTERLIFE_<KEY>` or `BELAY_<KEY>`: the env wins, unset it first); a key the env sets to the same value is left to it (a note says so) |

`enroll-track` decisions (`plans/enroll/`): arming adds CI content only, so an armed track's classes hold no record and the
gate blocks every one of their MRs (no tier record) until a record exists. `planEnroll` writes, for each class whose role
maps to the track (`ROLE_TRACK`, `poller/derive/tiers.ts`), `{tier: min(start_tier, ceiling), since, by: 'operator <user>
via enrollment MR'}`; a `human_only` class is skipped. Raising from nothing is still a raise, so it is a person-merged MR,
never a direct commit. The account is never invented (`plans/enroll/account.ts`): an account in tier-state.yml named for the
role, else the poller config's names for it (`BELAY_GUARDRAIL_AUTHORS` for the guardrail), else the accounts seen acting for
the role in the project within the task window (an agent MR whose `Belay-Class` is one of the role's classes; for the
guardrail, which acts in notes, a note with a belay-guardrail block). Several accounts at one source, or none, is refused
with the reason and where to set it. It also refuses when any of the track's classes already holds a record (first rung
only: promotion takes it from there), when trust-policy.yml has no `start_tier`, and when belay-policy cannot be read.

`promote-class` decisions (`plans/promote.ts`):

- `planPromote` refuses (`ActionRefused`, naming the date) while the class's record has a `cooldown_until` still ahead (`planPromote`'s `cooling` check, 565e23f). A date-only cooldown lifts at 00:00 UTC on that date, and a date-time with no zone is read as UTC (`readInstant`, `src/schemas/instant/readInstant.ts`).
- Re-admitting a quarantined class to Assisted is not refused during the cooldown (`planPromote`'s `readmit`, 565e23f). The new record keeps `cooldown_until` (the `record` it builds), so the class climbs no further before that date. This is the App Master's decision of 2026-10-09 (wake 1c7f329f), confirming the builder's choice; it matches the re-admit card's "does not lift the promotion cooldown".
- The preview's summary states the precondition "a person merges this MR; Belay never merges it" (`HUMAN_KEY`, `src/lib/promotion/rules.ts`; the `summary` of `planPromote`, 28d308a). It is no longer counted as a met rule row, and no GitLab approval setting is read (28d308a).
- When the index's belay-ledger for the project holds the next rung's trial for the holder since its record (`plans/trial.ts`, live only: the context's `ledgerOf` reads the index, demo has none), the MR description names it: the trial MRs' `tier_decision` seq range, the file (`events/<gitlab id>.jsonl`) and its head seq and hash, and the engine command that recomputes it (`npx tsx engine/cli.ts ledger trial --chain events/<gitlab id>.jsonl --through <seq> --head <hash> --agent <a> --class <id> --since <iso>`, every value filled in; a value that is not plain is single-quoted, 7f8e84f). The commit and its diff are the same with or without it.

Arm and disarm (`arm/`): the content is the repo's own, not Belay's idea. `content/` holds a track's include lines as
`gitlab/examples/target-project/.gitlab-ci.yml` writes them (its test checks them against the example and the templates'
`spec:inputs`). T4 (guardrail: `proof-engine` cited-diff alone; the `flow-dispatch` component is gone, belay-apply starts the guardrail), T3
(governor: `tier-gate`, report-only; its `proof_authors` is `BELAY_PROOF_AUTHORS`), T6 (maturity: `maturity-scan` alone; the
scanner templates stay the person's) and T1 (patcher: `proof-engine` exploit-test with the example's `build_args`) are defined, one
file each in `arm/content/`; a proof-engine include is told apart by its `class`, so T4 and T1 sit side by side. Any other track is refused with
the reason. The per-install values (the example's "Replace:" list) come from the environment in live mode:
`BELAY_PACK_VERSION`, `BELAY_ENGINE_REF`, `BELAY_ENGINE_COMMIT` (optional); a missing one is
named in the refusal. The guardrail's consumer id is not an arm value: it lives in belay-apply's `apply.json`. T4's token notes
put the write token on belay-apply, never on the target. Demo mode uses the example's values. The plan also refuses: no `.gitlab-ci.yml` on the default branch,
a stage the includes need that the pipeline lacks, a one-line `include:`, a component already included by hand, an open MR
from the same branch, an arm block already there (or edited). Neither intent reads, writes or names a token value, or sets
a CI variable. `arm/verifyAction.ts` (`'use server'`, `verifyArmAction(intent)`) is Setup's verify: a read of the default
branch's `.gitlab-ci.yml` that answers whether the block is there; demo mode reads nothing and says it is simulated.

Arm and disarm decisions (F38, be208a0, b7682ed, b56de42, 9ceefad):

- Every branch MR (`promote-class`, `enroll-track`, `stage-gap-mr`, `arm-track`, `disarm-track`) is built by one primitive,
  `plans/mr/branchMr.ts` (0a2fd39): `newBranch(ctx, project, branch)` is the preflight, `branchMr(ctx, {project, base,
  branch, commits, mr})` runs it, then plans the commits (`start_branch` on the first) and the MR. A plan for a new MR
  write goes through it, and its plan names the branch (`Plan.branch`).
- A commit goes only to a new branch. If the branch exists (`belay/arm-<key>`, `belay/disarm-<key>`,
  `belay/promote-<class>-<date>`, `belay/enroll-<track>-<date>`, the gap's `belay/...`), the preview refuses and names the
  branch, its head and what to do (`newBranch`, `plans/mr/branchMr.ts`). Force is never set.
- A 404 on the branch read means the branch is absent. Any other failure refuses (`newBranch`).
- A confirm is done only when the MR GitLab opened is headed by the commit this confirm made (`headMismatch`, `arm/head.ts`).
  Every plan that names its branch is checked (`checkHead` in `run.ts` reads `Plan.branch`, not a list of kinds, so a new branch MR cannot miss it); revoke and the CRA label open no MR and are not.
- Every branch MR sets `remove_source_branch` (`branchMr`), so a merged or closed MR does not leave a branch that
  `newBranch` would refuse on a same-day retry (`plans/__tests__/branch/removeBranch.test.ts`).
- `belay/*` is a protected branch pattern (Setup step 9).
- Known residual: GitLab's Files API answer names no commit, so the commit is read back with `getFile` right after the write.
  Moving arm and disarm to the Commits API is queued.

Target decisions (`plans/context.ts`):

- F46 (9c5737b): `locate()` takes belay-policy only at `<group>/belay-policy`, by full path (`locate`'s `policy` lookup), so a same-named project in a subgroup or shared in is never the one a revoke or promote writes.
- F47 (276d376): every plan that locates a target refuses one outside the paired group's path (`targetIn`, `plans/context.ts`), and so does arm's `targetOf`, which calls it (F37).
- F50 (180e163): Belay's own projects (`cfg.infra`) are refused as a target, so `stage-gap-mr` cannot open an MR in belay-policy, nor an arm or disarm (`targetIn`; the verify read refuses them too when `verifyArmAction` passes `cfg.infra`). A path that names two projects with no GitLab id to tell them apart is refused the same way (F48).
- F52 (3014213): a record's `since` is stamped to the minute (`minuteOf` in `plans/context.ts`; `revoke.ts:41`, `at` in `planPromote`), so a confirm within the minute of its preview has the same `previewId` and runs, instead of always coming back `changed`.
- One target rule (0a2fd39): `targetIn(ctx, indexId, infra)` (`plans/context.ts`) holds F48, F50 and F47; `locate()` adds belay-policy to it, and arm's `targetOf` calls it with `cfg.infra`, so an arm is refused in Belay's own projects and on an ambiguous path too. Setup's own `checkArm` read passes no `infra`.

- F90 (accepted residual, `planGapMr`'s `commitFile` calls): a gap's commits and draft MR run the proposed CI (the target's MR pipeline) as the operator before anyone reviews the MR. Accepted: it is inherent to proposing a CI change by MR, and since F83, F84 and F85 the operator sees every line that will run, on a branch that is new.
- A gap's file paths have no empty, `.` or `.git` segment (one file, one spelling, none inside `.git`) and its branch is a ref git accepts (`intents.ts` `pathOk`, `refOk`, `__tests__/intents/paths.test.ts`); anything else is refused before it is planned.
- F92 (Low, fixed): a preview is an anonymous endpoint on the hosted replay, and a new file's preview shows every line
  (F84), one diff row each, so its cost followed a line count that had no bound of its own. The largest intent the
  validator admitted (8 files of 64K newlines, inside Next's 1MB action body limit) cost about 60 ms of CPU and a 4 MB
  answer per call. A new file is now at most `MAX_FILE_LINES` (2000) lines, refused with the bound named
  (`MAX_FILE_LINES` and the line count in `files()`, `intents.ts`; `__tests__/replay/cost.test.ts`); the worst case left is about 1.6 MB out for
  0.5 MB in, under 15 ms. The seeded gaps (at most 46 lines a file, 18 a hunk) are admitted. A hunk was already bounded
  (400 lines of 500 characters), and so is the whole body (Next's default `serverActions.bodySizeLimit`, 1MB: keep it).

Project writes (`actions/vitals/`, the last three rows): they act on a real project Afterlife watches
(`<data>/projects/<slug>.yml`), as the person's own az login and files, not on the GitLab group, so `actions.ts` routes
them (`vitals/route.ts`) before any GitLab deps: every mode runs them for real (`mode: 'live'`), except the hosted replay,
which refuses, and in every mode they answer only a request addressed to this machine (`local.ts`). There is no index to
journal into, so `vitals/run.ts` keeps, in this process: the previews it issued (a confirm of an id it did not issue, or
one older than 15 minutes, is refused as stale and runs nothing), the confirms running now (a second is refused), and
each answer for 15 minutes (a repeat answers from it). A digest that moved answers `changed` with the new preview. Their
screens: Vitals' Queue N runs (`app/features/vitals/components/write/QueueSheet.tsx`) and Onboard's save step
(`onboard/wizard/components/AfterSave.tsx`, its intents built by `wizard/data/writes.ts` from the saved config), both
through `vitals/hooks/useProjectWrite.ts`. Tests: `vitals/__tests__/` against a fake az.

Starting a cycle run (`actions/runs/start/`, Theater's pre-run panel): its own endpoint, `startRunAction(intent, previewId?)`
(`'use server'`), the same round trip in one call: with no `previewId` it previews, with one it confirms that preview.
The intent is `{kind: 'start-run', repo, mode: 'execute' | 'propose', base?, onto?, waves (1-10), lanes (1-6), laneCapUsd,
waveCapUsd, model, ideas: ('scan' | 'lens-scan')[]}` (`runs/start/types.ts`, validated by `runs/start/intent.ts` with the
runner's own slug, ref and model rules): `base` and `onto` are exclusive, and propose takes neither. It is not an
`ActionIntent` (no `project`; `ActionPreview.kind` admits `'start-run'`). The preview is one command,
`belay run --repo <slug> --mode <m> [--base <ref> | --onto <branch>] --waves n --lanes n [--lane-cap usd --wave-cap usd]
--model m [--ideas scan,lens-scan]` (`runs/start/command.ts`; propose spells no branch or caps flag; a `base` equal to the
fleet's is not sent), and notes that say what it will and will not do (risk `low` propose, `policy` execute, `merge` onto an
existing branch). The confirm plans again and, when the digest matches, spawns `node cli/belay.mjs run ...` from the
Afterlife checkout DETACHED (`windowsHide`, `detached`, unref'd, no stdin), stdout and stderr appended to
`<data>/runs/<slug>/launch-<yyyymmdd-hhmmss>.log`, and answers at once (`made: 'pid N'`). Refused before anything is read:
the hosted replay, and a request not addressed to this machine (`vitals/route.ts` `projectAway`). Refused at preview and
again at confirm: a repo the fleet does not name (the runner's own loader, `runner/fleet/load.ts`, on
`<afterlife>/.belay/fleet.yml` plus saved projects with a runner block), a live process in
`<repo>/.claude/worktrees/belay-run.pid`, an `onto` branch that is not local or is checked out in any worktree (the main
checkout included). Memory, as the project writes': issued previews (15 minutes), the confirm running, the answers (a
repeat answers from them; a fresh preview of the same run makes the next confirm a new start). The panel's server read is
`runs/start/read.ts`: `runRepos()`, `listRunBranches(slug)` (local branches, each with the worktree that holds it, and the
checkout's HEAD branch: `runs/start/git.ts`) and `loadStartData()` (all of it, kept 5 s; closed on the replay). Tests:
`runs/start/__tests__/` (the validator and every flag combination as a string, the refusals and the round trip on a temp
git repo with a fake launch, the branch read, the action's guards).

Every intent may carry `proposal`: the inbox item it settles (closed as `acted` once every command ran, and only when it is the intent's own project's item: `__tests__/confirm/proposalScope.test.ts`).

## Responses

`{status: 'preview', preview}` -> `{status: 'done' | 'failed', preview, results}` | `{status: 'changed', preview}` | `{status: 'refused', reason}`.
`preview` = `{kind, title, summary, commands: [{display, argv, risk}], risk, diff, previewId, mode, branch?, notes?}`
(`branch`: the branch the commands create; `notes`: what the operator must know before the click, in order).
Each of `results` is `{display, exit, ok, simulated, error?, made?, url?}`. `made` is what GitLab made, from its own
answer: an MR (`!22`, with its `url`), or for a file write the commit that file now has on that branch (`commit 1a2b3c4d`,
read back right after the write, because the repository-files API answers only `{file_path, branch}`). Demo results are
`simulated` and name nothing.
`previewId` is a sha-256 of the commands and of the `proposal` they settle. If the files moved between the two calls, the second call plans again, the ids
differ, **nothing runs**, and `changed` returns the new preview to show again. A commit can still land between that
second read and the write: every `tier-state.yml` write therefore carries `last_commit_id` (repository-files API: "Last
known file commit ID"), and GitLab refuses it (400) rather than let a stale write land over an operator's revoke or a
tripwire demotion; the answer is `failed`. Without a `last_commit_id` from GitLab the write is not planned at all.

## Live vs demo

- **Live**: for each command, a `commands_run` row (who, argv, display, risk, at) is written *before* it runs, then finished
  with its exit (the GitLab HTTP status on failure, else 1). A failure stops the rest (a branch, then its MR). Then one poll
  cycle runs and the snapshot is rebuilt, whether or not every command passed.
- **Demo**: planned against the seeded fake group, never executed, no record: `results[].simulated === true`. Any
  `BELAY_MODE` but `live` is demo, the hosted replay's `replay` included (`data/config.ts:18`). Demo reads no
  environment: the group is the fake's own `GROUP_ID` and the poller settings are the defaults (`deps.ts:27-31`).
  - F93 (Low, fixed): demo read the server's `BELAY_*` settings all the same, and a refusal named one to any caller
    (`BELAY_POLICY_PROJECT` in "the group has no acme-lab/<name> project"); `__tests__/replay/env.test.ts`.
- **Run journal** (`runs/journal.ts`, table `action_runs`, migration 0016): a live confirm claims its `previewId`
  atomically before the first command and finishes it with the response it sent (`cut` when it threw). `confirmIntent`
  reads the record before it plans: a done within `RECALL_MS` (15 min) answers with that response, one still running in
  this process is refused as still running, and only a confirm that claimed the id executes, so a repeat or a parallel
  confirm never runs the commands twice. Before that, `confirmIntent` refuses a second live confirm of a `previewId` this
  process is still running, at once ("already running"; `__tests__/confirm/concurrent.test.ts`). A failed or cut run, or one a dead process left running, may run again.
  `recallAction(previewId: unknown)` (`runs/recallAction.ts`, `'use server'`, `notLocal` like the writes) answers a confirm
  that got no answer: `{kind: 'ran', response, at}` | `{kind: 'running', since}` | `{kind: 'never'}` | `{kind: 'unknown'}`
  (a cut run, or a row another process left running). Demo answers never; an away caller or a server not ready, unknown.
  It writes nothing. Needs you's Ask again on an unsure write asks it first.

A server action is an endpoint: validated, and it acts as whoever is logged in to `glab`. `previewId` is a digest of the
commands, not a secret: any caller that can reach the port can preview and then confirm. Next's own check (the Origin's
host must equal the Host) lets a request with no Origin through, and a page reached through DNS rebinding sends its own
name as both. So in live mode `previewAction`, `confirmAction`, `verifyArmAction`, `repollAction`, `repollGroupAction` and `recallAction` answer only a request whose Host,
X-Forwarded-Host and Origin name `localhost`, `127.0.0.1` or `[::1]` (`local.ts`); anything else is refused before anything
is planned or read. A process that reaches the port can forge those headers, and `next dev` / `next start` listen on
0.0.0.0 by default, so `npm run dev` and `npm start` now pass `-H 127.0.0.1` (`package.json`, `__tests__/listen.test.ts`).
That check still depends on the server listening on loopback only: do not start it another way, and do not expose its port. Demo mode is not held to it (it never runs
anything, and the hosted replay is served under its own name).

- F91 (Medium, fixed): behind a proxy, a container started in live mode by mistake (on Cloud Run, or behind a load balancer
  whose default route reaches it) receives the Host the caller chose, so Host, X-Forwarded-Host and Origin could all say
  localhost. `notLocal` now also refuses a request forwarded for an address that is not loopback: any `X-Forwarded-For`
  entry, `Forwarded`'s `for=`, or `X-Real-IP` (`local.ts:30-42`, `local.ts:53`, `__tests__/replay/forwarded.test.ts`). Next sets
  `X-Forwarded-For`, when absent, to the socket's address, so the operator's own page still passes. Residual: a proxy that
  rewrites Host to the upstream's loopback name and adds no forwarding header (nginx's default `proxy_pass`) still passes:
  never put a proxy or a tunnel in front of a live Belay.

## Re-poll (a read)

`repollAction(projectId: unknown): Promise<RepollResult>` (`repollAction.ts`, `'use server'`) is the one read a screen asks
for: in live mode it runs the live runtime's `refresh()` (one poll cycle, then a fresh snapshot) and calls `refresh()` from
`next/cache`, so the current route renders again in the same round trip. `repoll.ts` decides the answer:
`{ok: true, ageSec}` only when the cycle finished and polled that project without error; otherwise `{ok: false, reason}`
(not ready, the cycle did not finish, the group failed, the project failed or is not in the polled group). It writes
nothing, to GitLab or the index beyond what a poll writes. A cycle reads the whole group as the operator, so two re-polls
are at least `REPOLL_GAP_MS` (10 s) apart, failed ones included; one asked for sooner runs nothing and says when to ask
again. Demo mode answers that it has nothing to poll.

## Screens that call them

`words.ts` (pure, client-safe) words an answer with only what it says: `outcomeOf(response, what)` gives the toast text
(a demo done says "Simulated", never "pushed"; a live done names `made`), and `viewOf` turns a preview answer into what a
screen holds (`{kind: preview}` or `{kind: refused, reason}`).

- **Ladder** revoke (`app/features/ladder/write/revoke.ts`): `previewAction` as soon as a revoke target is in view
  (the selected class, the highlighted menu target, or a `q` press), the preview in the inspector and the dock;
  `confirmAction(intent, preview.previewId)` on r, the button or the menu item.
- **Ladder** promote and re-admit (`app/features/ladder/write/promote.ts`): the same `promote-class` round trip as Needs
  you's, through `needs-you/write/promote.ts`, on p or the click.
- **Needs you** n1 (promote) and n4 (re-admit, a promote-class to Assisted) (`app/features/needs-you/write/promote.ts`):
  `previewAction` when the decision is selected or staged, the preview in the outbox and the inspector, `confirmAction` on Run.
  The live desk (`write/live.ts`) sends those and a live gap's `apply-gap-template` (`write/gapTemplate.ts`); the demo
  desk (`write/desk.ts`) sends a gap's `stage-gap-mr` through Maturity's `write/gap.ts`.
- **Maturity** gap sheet (`app/features/maturity/write/gap.ts`): `stage-gap-mr`.
- **Setup** arm, disarm and verify (`app/features/setup/write/arm.ts`): `previewAction` when the track's Arm or Disarm
  section is in view, `confirmAction` on its button; "I merged it · verify" calls `verifyArmAction`. Enroll
  (`setup/write/enroll.ts`): `enroll-track`, the same round trip.
- **Theater** pre-run panel (`app/features/theater/start/useStartRun.ts`): `startRunAction(intent)` on Preview,
  `startRunAction(intent, preview.previewId)` on Start run; a done start goes to `/theater?live=1`.
- **Onboard** batch (`app/features/onboard/write/write.ts`): each project's `arm-track` and `enroll-track`, as Setup
  sends them: `previewAction` once the write is on screen, `confirmAction` of that preview on Run.

- Guard (941dcf1, `__tests__/handwritten.test.ts`): `src/app` holds no hand-written gap MR, gap issue, probe or scan,
  nor an `az pipelines run`, an App Insights component create or an App Service app setting write (the project writes),
  nor a `belay run --repo <a named repo>` (a run is started through `startRunAction`'s preview). Its
  one allowance is `src/app/features/kit`, the component gallery's sample text (`NOT_A_SEND` in the test).

Not wired yet: the CRA sign-off (`mark-cra-ready`): no screen sends it, and `needs-you/data/cra.ts` still shows its own
illustrative commands.
Not verified live: `start_branch` on the repository-files API, `PUT /projects/:id/issues/:iid` for a work item, and the
policy branch being pushable by the operator (spike S8). The fake does not model branches, issues or protections; it
models `last_commit_id` (a file write makes a new one, a stale one is refused with GitLab's 400).
