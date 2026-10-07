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
| `revoke-class` | `project`, `changes: [{class, to}]`, `why?` | one `PUT` of `tier-state.yml` to `belay-policy`'s default branch (risk `policy`). Lowers only |
| `promote-class` | `project`, `class`, `to` | a branch with the new record (`start_branch` = default), then a policy MR labelled `belay::promotion`. Belay never merges |
| `mark-cra-ready` | `project`, `issue` | one `PUT` of the clock work item's labels: `cra::ready-to-sign`, minus `cra::drafting`. Never submits |
| `stage-gap-mr` | `project`, `gap`, `stage`, `from`, `to`, `title`, `branch` (`belay/...`), `files: [{path, content}]`, `workItem?` | one commit per file on a new branch, then a draft MR labelled `maturity::gap` |

Every intent may carry `proposal`: the inbox item it settles (closed as `acted` once every command ran).

## Responses

`{status: 'preview', preview}` -> `{status: 'done' | 'failed', preview, results}` | `{status: 'changed', preview}` | `{status: 'refused', reason}`.
`preview` = `{kind, title, summary, commands: [{display, argv, risk}], risk, diff, previewId, mode}`.
`previewId` is a sha-256 of the commands. If the files moved between the two calls, the second call plans again, the ids
differ, **nothing runs**, and `changed` returns the new preview to show again.

## Live vs demo

- **Live**: for each command, a `commands_run` row (who, argv, display, risk, at) is written *before* it runs, then finished
  with its exit (the GitLab HTTP status on failure, else 1). A failure stops the rest (a branch, then its MR). Then one poll
  cycle runs and the snapshot is rebuilt, whether or not every command passed.
- **Demo**: planned against the seeded fake group, never executed, no record: `results[].simulated === true`.

A server action is an endpoint: same-origin only (Next checks), validated, and it acts as whoever is logged in to `glab`.
Run Belay on `localhost`; do not expose its port.

## Re-poll (a read)

`repollAction(projectId: unknown): Promise<RepollResult>` (`repollAction.ts`, `'use server'`) is the one read a screen asks
for: in live mode it runs the live runtime's `refresh()` (one poll cycle, then a fresh snapshot) and calls `refresh()` from
`next/cache`, so the current route renders again in the same round trip. `repoll.ts` decides the answer:
`{ok: true, ageSec}` only when the cycle finished and polled that project without error; otherwise `{ok: false, reason}`
(not ready, the cycle did not finish, the group failed, the project failed or is not in the polled group). It writes
nothing, to GitLab or the index beyond what a poll writes. Demo mode answers that it has nothing to poll.

## Not done

No UI button calls these yet. The next step wires the Ladder revoke, the Needs-you rows and the Maturity sheet:
`previewAction` on open, the preview into the existing command block, `confirmAction(intent, preview.previewId)` on the click.
Not verified live: `start_branch` on the repository-files API, `PUT /projects/:id/issues/:iid` for a work item, and the
policy branch being pushable by the operator (spike S8). The fake does not model branches, issues or protections.
