# src/server/actions - operator writes (module B6)

Belay writes only on a click, as the operator's own `glab` login, and shows the exact command first. Two server actions,
`actions.ts` (`'use server'`):

```ts
previewAction(intent: unknown): Promise<ActionResponse>                   // plans; nothing runs
confirmAction(intent: unknown, previewId: string): Promise<ActionResponse> // plans again; runs only if the digest still matches
```

## Intents (`types.ts`; validated by `intents.ts`, which refuses anything else)

| `kind` | Fields | What the commands do |
|---|---|---|
| `revoke-class` | `project`, `changes: [{class, to}]`, `why?` | one `PUT` of `tier-state.yml` to `belay-policy`'s default branch (risk `policy`), with the file's `last_commit_id` as read. Lowers only. A revoke reaches an MR the gate already set to auto-merge at belay-apply's next sweep, which cancels that auto-merge (F74, `gitlab/apply`, 991da24); the revoke plan itself writes only `tier-state.yml` |
| `promote-class` | `project`, `class`, `to` | a branch with the new record (`start_branch` = default, `last_commit_id` as read), then a policy MR labelled `belay::promotion`. Belay never merges |
| `mark-cra-ready` | `project`, `issue` | one `PUT` of the clock work item's labels: `cra::ready-to-sign`, minus `cra::drafting`. Never submits |
| `stage-gap-mr` | `project`, `gap`, `stage`, `from`, `to`, `title`, `branch` (`belay/...`), `files: [{path, content} or {path, hunk}]` (1 to 8), `workItem?` | one commit per file on a new branch under `belay/`, then a draft MR labelled `maturity::gap`. A hunk is applied to the base file only on an exact, contiguous, single match, else `ActionRefused`; it is never written as a whole file (`plans/hunk.ts`, 775d1ab). A content file is a new file only: content for a path the base has is refused (F83, e51a17e); a new file is shown whole in the preview (F84, 1616040); the `belay/` branch must not exist yet (F85, ebaaac1); a hunk needs the base file's `last_commit_id` (F87, 42f1f26); a blank context line never matches past the final newline (F86, 105e84e); a context that matches in two places is refused at preview and at confirm (84b74e1) |
| `arm-track` | `project`, `track` (`T1`-`T8`) | one commit of `.gitlab-ci.yml` on a new branch `belay/arm-<key>` (`start_branch` = default, `last_commit_id` as read), then one MR labelled `belay::arm`. Adds the track's include lines between `# belay:arm` markers |
| `disarm-track` | `project`, `track` | the same on `belay/disarm-<key>`: removes exactly the marked lines the arm added (their digest is in the begin marker), or refuses |

Arm and disarm (`arm/`): the content is the repo's own, not Belay's idea. `content.ts` holds a track's include lines as
`gitlab/examples/target-project/.gitlab-ci.yml` writes them (its test checks them against the example and the templates'
`spec:inputs`). Only T4 (guardrail: `proof-engine` cited-diff alone; the `flow-dispatch` component is gone, belay-apply starts the guardrail) is defined; any other track is refused with
the reason. The per-install values (the example's "Replace:" list) come from the environment in live mode:
`BELAY_PACK_VERSION`, `BELAY_ENGINE_REF`, `BELAY_ENGINE_COMMIT` (optional); a missing one is
named in the refusal. The guardrail's consumer id is not an arm value: it lives in belay-apply's `apply.json`. T4's token notes
put the write token on belay-apply, never on the target. Demo mode uses the example's values. The plan also refuses: no `.gitlab-ci.yml` on the default branch,
a stage the includes need that the pipeline lacks, a one-line `include:`, a component already included by hand, an open MR
from the same branch, an arm block already there (or edited). Neither intent reads, writes or names a token value, or sets
a CI variable. `arm/verifyAction.ts` (`'use server'`, `verifyArmAction(intent)`) is Setup's verify: a read of the default
branch's `.gitlab-ci.yml` that answers whether the block is there; demo mode reads nothing and says it is simulated.

Arm and disarm decisions (F38, be208a0, b7682ed, b56de42, 9ceefad):

- A commit goes only to a new branch. If `belay/arm-<key>` or `belay/disarm-<key>` exists, the preview refuses and names the
  branch, its head and what to do (`arm/plan.ts:72-84`). Force is never set.
- A 404 on the branch read means the branch is absent. Any other failure refuses (`arm/plan.ts:73-80`).
- A confirm is done only when the MR GitLab opened is headed by the commit this confirm made (`arm/head.ts:33-42`). Only
  `arm-track` and `disarm-track` are checked (`arm/head.ts:9`); every other intent is unchanged (`run.ts:4`).
- The arm or disarm MR sets `remove_source_branch` (`arm/plan.ts:123`, `arm/plan.ts:153`).
- `belay/*` is a protected branch pattern (Setup step 9).
- Known residual: GitLab's Files API answer names no commit, so the commit is read back with `getFile` right after the write.
  Moving arm and disarm to the Commits API is queued.

Target decisions (`plans/context.ts`):

- F46 (9c5737b): `locate()` takes belay-policy only at `<group>/belay-policy`, by full path (`context.ts:53-54`), so a same-named project in a subgroup or shared in is never the one a revoke or promote writes.
- F47 (276d376): every plan that locates a target refuses one outside the paired group's path (`context.ts:59-61`), as arm's `targetOf` already did (F37).
- F50 (180e163): Belay's own projects (`cfg.infra`) are refused as a target, so `stage-gap-mr` cannot open an MR in belay-policy (`context.ts:56-58`).
- F52 (3014213): a record's `since` is stamped to the minute (`minuteOf`, `context.ts:72`; `revoke.ts:41`, `promote.ts:31`), so a confirm within the minute of its preview has the same `previewId` and runs, instead of always coming back `changed`.

- F90 (accepted residual, `plans/gap.ts:50-54`): a gap's commits and draft MR run the proposed CI (the target's MR pipeline) as the operator before anyone reviews the MR. Accepted: it is inherent to proposing a CI change by MR, and since F83, F84 and F85 the operator sees every line that will run, on a branch that is new.

Every intent may carry `proposal`: the inbox item it settles (closed as `acted` once every command ran).

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
- **Demo**: planned against the seeded fake group, never executed, no record: `results[].simulated === true`.

A server action is an endpoint: validated, and it acts as whoever is logged in to `glab`. `previewId` is a digest of the
commands, not a secret: any caller that can reach the port can preview and then confirm. Next's own check (the Origin's
host must equal the Host) lets a request with no Origin through, and a page reached through DNS rebinding sends its own
name as both. So in live mode `previewAction`, `confirmAction` and `repollAction` answer only a request whose Host,
X-Forwarded-Host and Origin name `localhost`, `127.0.0.1` or `[::1]` (`local.ts`); anything else is refused before anything
is planned or read. A process that reaches the port can forge those headers, and `next dev` / `next start` listen on
0.0.0.0 by default, so `npm run dev` and `npm start` now pass `-H 127.0.0.1` (`package.json`, `__tests__/listen.test.ts`).
That check still depends on the server listening on loopback only: do not start it another way, and do not expose its port. Demo mode is not held to it (it never runs
anything, and the hosted replay is served under its own name).

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
- **Needs you** n1 (promote) and n4 (re-admit, a promote-class to Assisted) (`app/features/needs-you/write/promote.ts`):
  `previewAction` when the decision is selected or staged, the preview in the outbox and the inspector, `confirmAction` on Run.

- Guard (941dcf1, `__tests__/handwritten.test.ts`): `src/app` holds no hand-written gap MR, gap issue, probe or scan. Its two allowances are `src/app/features/kit` and `setup/data/stepDetail.ts` (`NOT_A_SEND`, line 56).

- **Setup** arm, disarm and verify (`app/features/setup/write/arm.ts`): `previewAction` when the track's Arm or Disarm
  section is in view, `confirmAction` on its button; "I merged it · verify" calls `verifyArmAction`.

Not wired yet: the CRA sign-off (`mark-cra-ready`), the gap MRs (`stage-gap-mr`) and the Maturity sheet still show the
screens' own illustrative commands.
Not verified live: `start_branch` on the repository-files API, `PUT /projects/:id/issues/:iid` for a work item, and the
policy branch being pushable by the operator (spike S8). The fake does not model branches, issues or protections; it
models `last_commit_id` (a file write makes a new one, a stale one is refused with GitLab's 400).
