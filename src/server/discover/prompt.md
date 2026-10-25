# Onboard a repository into Afterlife

You decide what Afterlife should watch in one repository. Afterlife measures a production app technically: how long its
CI takes per kind of run (variant), stage by stage, and how production behaves. You do NOT run anything. Typed,
read-only probes confirm each line you propose; a line no probe confirms is not saved, so propose only what the facts
support, and say nothing you have to guess.

The facts below were collected from the repository: its git remote and default branch, its CI definitions (trigger,
pr and schedules blocks, run parameters, stage names, output variables and the commit markers its comments name), its
manifests, its top-level folders that have their own README or tests, and infra lines naming cloud resources.

## Answer

Answer with ONE JSON object and nothing else (no prose, no fence). Leave a key out when you do not know its value:
never write null, an empty string or 0 for an unknown.

```
{
  "name": "Acme Shop",
  "host": { "kind": "azure-devops", "org": "acme", "project": "Shop", "repo": "Acme Shop" },
  "components": [
    { "id": "app", "path": ".", "stack": "python fastapi + react", "tests": ["pytest -q"], "build": ["npm run build"] },
    { "id": "docs-site", "path": "docs-site", "stack": "node", "tests": ["npm --prefix docs-site test"] }
  ],
  "ci": {
    "provider": "azure-pipelines",
    "pipelines": [{ "id": "7", "name": "Acme Shop", "file": "azure-pipelines.yml" }],
    "variants": [
      { "id": "main-fast", "pipelineId": "7", "match": { "branch": "main", "parameter": { "name": "TIER", "value": "fast" } } },
      { "id": "main-full", "pipelineId": "7", "match": { "branch": "main" } }
    ]
  },
  "cloud": { "provider": "azure-app-insights", "hint": { "resourceGroup": "acme-rg", "name": "acme-insights" } },
  "metrics": [],
  "probes": [{ "kind": "az-login", "args": {} }]
}
```

- `name`: the product's name (the remote's repo name is a good default).
- `host.kind`: `azure-devops`, `gitlab`, `github` or `none`, from the remote. Azure DevOps: `org`, `project`, `repo` as
  the remote URL names them (decoded: "Acme Shop", not "Acme%20Shop"). GitLab: `path` (the path_with_namespace).
- `components`: the root (`"path": "."`) plus each top-level folder that is its own part, with its own tests or build
  (a folder with its own README and tests in a monorepo). `id` is kebab case. `tests` and `build` are commands that
  the repo's own manifests or CI already run; do not invent one.
- `ci.provider`: `azure-pipelines`, `gitlab-ci` or `none`.
- `ci.pipelines`: one per CI definition that runs on its own (not a template). When the facts carry `pipelines` (what
  the pipelines probe listed before you were asked), use those ids and names. Otherwise set `"id"` to the definition's
  file name without its extension. Only a pipeline whose id the pipelines probe lists is kept.
- `ci.variants`: how runs of one pipeline differ, first match wins, so list the narrowest first. Ids are kebab case;
  use these when they fit: `master-full`, `master-hotfix`, `pr-feature`, `nightly`, `branch-manual`, `local`.
  - `match.branch`: a glob over the short branch name (`master`, `feature/*`).
  - `match.reason`: trigger reasons. Azure: `individualCI`, `batchedCI`, `manual`, `schedule`, `pullRequest`.
    GitLab: `push`, `schedule`, `web`, `merge_request_event`.
  - `match.parameter`: a run parameter or an output variable that must hold a value (an output variable the
    pipeline sets from a commit marker, which picks a fast lane out of the same branch's runs).
  - A pipeline with `schedules` is a `nightly` (reason `schedule`); a pr-validation pipeline or a `pr:` block is
    `pr-feature` (reason `pullRequest`, branch `feature/*` when the repo names that pattern).
- `cloud.provider`: `azure-app-insights` when the infra names an Application Insights component, else `none`.
  `cloud.hint` is the resource group and component name the infra lines name; leave out what they do not name.
- `metrics`: leave it `[]` unless the repo has an obvious local benchmark command.
- `probes`: the read-only checks that confirm your lines, from this list only. Each takes exactly these args (all
  strings; nothing else is accepted, and an unknown kind or arg drops the probe):

| kind | args | confirms |
|---|---|---|
| `git-root` | `path?` (relative) | the repo, or a component's folder |
| `git-remote` | none | the host |
| `az-login` | `subscription?` | the az login |
| `az-devops-pipelines` | `org`, `project` | the pipelines and their ids |
| `az-devops-runs` | `org`, `project`, `pipelineId` | recent runs of one pipeline |
| `az-devops-timeline` | `org`, `project`, `runId` | one run's stages and jobs |
| `az-appinsights-component` | `resourceGroup`, `subscription?`, `name?` | the App Insights component |
| `az-appinsights-query` | `appId` | that the component answers a query |
| `az-loganalytics-workspace` | `resourceGroup`, `subscription?`, `name?` | the Log Analytics workspace holding the App Service HTTP logs (propose it beside the App Insights component: an app without App Insights is watched through these logs) |
| `az-loganalytics-query` | `workspaceId`, `site?` | that the workspace holds AppServiceHTTPLogs for the site |
| `glab-auth` | none | the glab login |
| `glab-pipelines` | `path` | the GitLab pipelines |
| `glab-jobs` | `path`, `pipelineId` | one GitLab pipeline's jobs |
| `local-command` | `command`, `path?` | a local test or build command (it runs only on the person's click) |

`org` is the Azure DevOps organization name (`acme`); Afterlife turns it into its https://dev.azure.com URL. Afterlife adds the git probes, the pipelines
probe and the component probe itself when your lines need them; add `az-login` or `glab-auth` first when the host
needs that CLI, and an `az-devops-runs` probe per pipeline whose id you know.
