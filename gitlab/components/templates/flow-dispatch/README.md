# flow-dispatch

Starts a custom flow run through the Flows API (`POST /api/v4/ai/duo_workflows/workflows`) for an agent-authored merge
request. It exists because **a trigger needs a person to perform the triggering action**: "a bot user, service account user, or
another flow, cannot activate a trigger" ([S] docs.gitlab.com/user/duo_agent_platform/triggers/). A merge request opened by the
patcher's service account never fires the guardrail's "merge request created" trigger, so a job starts it instead.

**Job:** `belay-flow-dispatch`. **Stage:** `.post`. **Runs:** on merge request pipelines of agent MRs. Include it once per flow
(guardrail, and gardener or QA when they are started this way).

## Include

```yaml
include:
  - component: $CI_SERVER_FQDN/acme/belay-pack/flow-dispatch@1.0.0
    inputs:
      engine_ref: v0.1.0
      consumer_id: 4711            # the guardrail flow as enabled in this project
```

For QA, add a second include with `goal: '$CI_MERGE_REQUEST_IID $CI_ENVIRONMENT_URL'` in a job that runs after the review app
deploys. The goal must be short plain text (an iid or a URL): `dispatch.mjs` refuses anything else, so MR text can never reach
the flow as its goal.

## Inputs

| Input | Type | Default | Meaning |
|---|---|---|---|
| `stage` | string | `".post"` |  |
| `engine_ref` | string | **required** | Tag, branch or full SHA of the Belay engine to run. Required, so the checker is always pinned. |
| `engine_commit` | string | `""` | Optional 40-char SHA the checkout must resolve to. Set it when engine_ref is a tag or branch. |
| `engine_project` | string | `"$CI_PROJECT_ROOT_NAMESPACE/belay-engine"` | Project path holding the Belay repo (engine/, src/schemas, gitlab/). Must allowlist this project's job token. |
| `policy_project` | string | `"$CI_PROJECT_ROOT_NAMESPACE/belay-policy"` |  |
| `policy_ref` | string | `"main"` |  |
| `node_image` | string | `"node:22-bookworm"` |  |
| `glab_version` | string | `"1.120.0"` |  |
| `glab_sha256` | string | `""` |  |
| `runner_tags` | array | `[]` |  |
| `consumer_id` | number | **required** | The integer id of the flow as enabled in this project (ai_catalog_item_consumer_id). [R?] where to read it. |
| `goal` | string | `"$CI_MERGE_REQUEST_IID"` | What the flow receives as context:goal. Keep it an MR iid or a URL, never text taken from an MR. |
| `agent_prefix` | string | `"ai-"` | Only MRs from accounts with this prefix and a Belay-Task trailer start a run. |
| `dispatch_token_var` | string | `"BELAY_DISPATCH_TOKEN"` | Name of the CI variable holding a token allowed to create flow runs. [R?] required scope; spike S1. |

## Verify

- `[R?]` this is spike S1: whether the token may create runs, with which scope (`ai_workflows`?), and which identity the run gets.
  The Flows API page does not state scopes or job-token support ([S] docs.gitlab.com/api/duo_agent_platform_flows/).
- `[R?]` where to read `ai_catalog_item_consumer_id` for a flow enabled in a project.
- `[R?]` whether `environment: ambient` is accepted for a custom flow started this way.
