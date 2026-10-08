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

## Who calls these

Three screens, through the shared kit in `src/components/write/`:

- **Needs you**: each outbox item whose decision maps to an intent (`features/needs-you/model/intents.ts`: n1 and n4
  promote a class, n2 marks the CRA notice ready, a gap stages its MR) is previewed when the drawer shows it. Run
  confirms that preview; a refusal disables Run and shows the server's reason.
- **Ladder**: the dock previews the selected row's revoke (`features/ladder/model/write.ts`); `r` and the revoke menu
  confirm it, or plan and confirm in one step (`sendNow`) for a target the dock did not show.
- **Maturity**: the Send sheet previews every picked MR gap (`features/maturity/model/flow/intent.ts`); Send and Enter
  confirm them in order and stop at the first that does not go through. A probe sends nothing.

The screen moves its own state on only after `done`. In demo mode that `done` carries `simulated: true` and the
message says nothing was executed.

`stage-gap-mr` refuses an update that would drop lines of an existing file: a gap MR only adds (`keepsEveryLine`).

## Not done

Not verified live: `start_branch` on the repository-files API, `PUT /projects/:id/issues/:iid` for a work item, and the
policy branch being pushable by the operator (spike S8). The fake does not model branches, issues or protections.
Onboard's batch and Setup's writes still show commands from their own fixtures and do not call these actions.
