# Onboard (`/onboard`)

> The wizard now lives at [`/start`](start.md) (its Pick a repo and Stack steps); `/onboard` redirects there. This page
> documents the discovery engine those steps use, and the demo estate at `/onboard/estate`.

> Which real project should Afterlife watch, and what in it can be measured?

## What it does
One page in three steps brings a real repo under watch.
1. **Your repos.** It lists the git toplevels you already work in with Claude Code, newest first. Each row shows the
   name, the path, the branch, a host chip (Azure DevOps, GitLab, GitHub or no remote), when you last used it, and an
   **Onboarded** mark. A row that is already onboarded offers **Open its Vitals** or **Re-run**. If the repo is not in
   the list, paste its path. With no Claude Code history, the path field is all there is.
2. **What Afterlife found.** A low-effort model proposes what to watch: the host, the components (release-log inside
   Grinex Portal), the pipelines and their variants (master-full, master-hotfix, pr-feature, nightly), and the cloud
   resource. Each proposal becomes a checklist line, grouped by Host, Components, Pipelines & variants, and Cloud. A
   typed, read-only probe checks each line, and the line moves from **proposed** to **probing** to **ok** or **failed**
   while you watch.
   - A failed line shows the probe's own summary. If the cause is a lapsed login, it also shows the re-login command
     (`az login`, `glab auth login`) with a Copy button.
   - Two findings are shown and never saved:
     - **never ran**: a CI file that is in the repo but has no registered pipeline. Example: Grinex's
       `pipelines/pr-validation.yml` and `nightly-full.yml` say "defined in the repo, never ran".
     - **your step: Turn on App Insights**: shown when the component probe finds no component. It lists the `az`
       commands that create the component and point the web app at it. Afterlife never runs them.
   - The footer names the engine and the time taken: "sonnet 5.5 · low · 11 s". The **Engine** switch chooses
     sonnet 5.5 at low effort (the default) or haiku 5.5 at low effort (the A/B arm).
3. **Save and collect.** Saves only the lines a probe confirmed, then links to `/vitals/<slug>`.

The estate funnel that used to live here is now the **Demo estate** page, linked from the footer.

## How it works
- `app/(app)/onboard/page.tsx` reads "Your repos" on the server at request time, but only for a request addressed to
  this machine (`server/actions/local.ts` `notLocal`). The proposal, the probes and the save run from the client
  through `/api/onboard/*`. Those routes are loopback only too: a request from anywhere else gets a 403.
- `server/discover/` holds the engine, which is hybrid: the model only decides, and deterministic code collects the
  facts and runs the probes.
  - `repos/`: `listClaudeRepos`. It reads `AFTERLIFE_CLAUDE_PROJECTS_DIR` (default `~/.claude/projects`). From each
    project dir it takes the newest session file and reads at most its first 64 KB, looking for the first `cwd`.
    - It drops temp, `/tmp/`, build-session, afterlife-reflect (and the older belay-reflect) and `.claude/worktrees` paths, and paths that no longer
      exist.
    - It folds the rest onto `git rev-parse --show-toplevel` (8 gits at a time) and dedupes, ignoring case on
      Windows.
    - It adds the branch and the origin remote. Userinfo is dropped from the remote.
    - The listing is cached for 60 s.
  - `facts/`: `collectFacts` gathers, in under a second:
    - every CI file, with its trigger, pr and schedules blocks, parameters, stages, output variables (`LANE`:
      normal, hotfix) and commit markers;
    - the manifests;
    - top-level folders that have their own README or tests;
    - infra lines that name a resource group or an App Insights component (lines holding a key or connection string
      are never kept);
    - the remote and the default branch.

    The facts are capped at 25 KB.
  - `propose/`: makes **one** `claude -p --model <m> --effort low` call with **no tools**. It reuses
    `runner/agent/spawn.ts`, whose `claudeArgs` takes an optional trailing `effort`.
    - The call runs from a fresh temp dir, so the repo's own `.claude` hooks never run.
    - Before the call, the pipelines probe runs once, so the model is told the real pipeline ids and names.
    - `parseProposal` is strict. It drops unknown probe kinds, args a kind does not take, unsafe values, variants of
      unknown pipelines and badly formed lines, and counts the dropped probes.
    - `completeProbes` adds the probe that confirms each line (git first, then the pipelines list, then the App
      Insights component).
    - The prompt is `server/discover/prompt.md`.
  - `probes/`: `runProbes` runs the specs one at a time, in order.
    - `git-root` and `git-remote` are answered here, and `local-command` is `skipped`, because it runs only on your
      click.
    - Every other kind goes through `providers/registry`. A throw becomes a `fail` line, never a crash.
    - Each result the probe route returns carries an HMAC **seal**. The key lives in this server process only.
  - `confirm.ts`: `confirmProject` saves a line only when an ok probe confirms it.
    - The host comes from `git-remote` data.
    - A pipeline is kept only if a pipelines probe listed its id. Variants are kept only with their pipeline.
    - `cloud.resource` comes only from the data of an `az-appinsights-component` ok result.
    - A component is kept only if its path exists. The runner gates come from the kept components' tests.
  - `store/`: writes `<data>/projects/<slug>.yml`, where `<data>` is `AFTERLIFE_DATA_DIR` (default `.afterlife`, or an existing `.belay`; gitignored).
    - The slug is the kebab-cased name, unique among the existing files. A root that is onboarded again keeps its slug.
    - A file that is not a valid project is skipped and counted.
- Routes:
  - `GET /api/onboard/repos`
  - `POST /api/onboard/propose {root, engine: 'sonnet'|'haiku'}`. The answer also carries the repo's `ciFiles`.
  - `POST /api/onboard/probe {root, spec}`: returns `{result, seal}`.
  - `POST /api/onboard/save {root, engine, proposal, results}`: keeps only the sealed results.
- `features/onboard/wizard/`: `WizardScreen`, `hooks/useWizard` (propose, then one probe request per spec so the
  checklist streams; a new pick aborts the previous run), and `model/lines.ts` (the checklist).
  `model/findings.ts` produces the never-ran and Turn-on-App-Insights lines.

## Rules it keeps
- **Every saved line has an ok probe.** A failed probe is shown with its summary and is never saved. A client cannot
  hand in an `ok` result the server did not seal.
- **Read-only.** The probes run git, az and glab reads only. No pipeline is queued, nothing is written into the repo,
  and a re-login or Turn-on command is shown, never run.
- **The client names an engine, never a model.**
- **Unknown is never zero.** A value that is absent is an omitted key. A finding is reported only after a probe
  answered.

## A/B
`npm run onboard:ab -- <path>` runs the proposal on both engines, one after the other. For each it prints the wall
seconds, the dropped probes and the lines proposed, then how far the two agree (pipelines, variants, components,
cloud hint). It writes the report to `<data>/onboard-ab/<ts>.json`.

## Tests
- `server/discover/repos/repos.test.ts`: a fixture projects dir (newest file, scratch and vanished paths, folding
  onto the toplevel, ordering, the onboarded mark), the 64 KB cap, and remote parsing.
- `facts/facts.test.ts`: a fixture repo shaped like Grinex, and the cap.
- `propose/propose.test.ts`: what `parseProposal` drops, `completeProbes`, a single tool-less call with effort, a
  missing claude, an invalid answer, and the pipelines probe that runs before the call.
- `probes/probes.test.ts`: git probes, a provider that throws, seals.
- `confirm.test.ts`: every drop. `store/store.test.ts`: the round trip, unique slugs, skipped files.
- `app/api/onboard/*/route.test.ts`: each route, loopback refusal, and a forged `ok` that saves nothing.
- `features/onboard/wizard/render.test.ts`: every state. These are: no history, onboarded, proposing, claude missing,
  invalid, a probe fail with re-login, findings, a lapsed login on the cloud probe, review, and saved.

## Demo estate (`/onboard/estate`)
Illustrative demo data: a made-up GitLab estate (184 projects) brought in as a **funnel**, unchanged from the
original Onboard screen: **Discovered → Baselined → Paired → Watching → In cycles**.
- The group bars and the estate baseline (stage × rung) name the weakest stage.
- The next batch has three parts:
  - **Only you**: merges, tokens, setups under way.
  - **Reads**: every one runs (simulated).
  - **Writes**: bootstrap `arm-track` MRs and enroll `enroll-track` MRs, capped at 5, 10 or 20.
- **Preview batch** (`/onboard/estate?preview=1`) shows the exact commands for every read and the server's preview of
  every write. **Run as you** confirms only a preview on screen.
- The code is `features/onboard/OnboardScreen.tsx` with its `components/`, `hooks/`, `model/` and `write/`.
- The tests are `model/onboard.test.ts`, `render.test.ts` and `write/*.test.ts`.
- Rules: only a probe moves a project on, writes go as you through the server, and unknown baselines are unknown,
  not zero.
