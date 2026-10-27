# Google Cloud deployment (DECISIONS.md D5)

- **Demo bank** (`ledgerline`, its own repo): review apps per MR, `staging` and `production`
  services on Cloud Run, deployed by the pipeline with OIDC (Workload Identity Federation), no
  stored keys. Terraform state managed by GitLab, which also covers the Configure stage.
- **Afterlife hosted replay**: this app's standalone build with `AFTERLIFE_MODE=replay`, serving a ledger
  snapshot read-only, with no tokens and no write path. It is the public live link for judges and
  must stay up until about 16 November.

The deployment code must be in the public repo for the +0.2 bonus. The hosted replay's is here:

| File | What it is |
|---|---|
| `Dockerfile` | Multi-stage build from the repo root: `npm ci`, `next build` (standalone), then a runtime stage with `.next/standalone`, `.next/static`, `public/` and `policy/` beside `server.js`. `AFTERLIFE_MODE=replay`, `HOSTNAME=0.0.0.0`, `PORT` 8080 by default (Cloud Run overrides it), `CMD ["node", "server.js"]`, user `node`, app files root-owned. |
| `Dockerfile.dockerignore` | The build context filter (BuildKit reads it beside the Dockerfile): no `node_modules`, `.next`, `.afterlife`, `.belay`, `.env*`, `docs/`, `design/`, `.contest/`, `.claude/`, `DECISIONS.md`, `scratch/`, `.git` or the local vaults. The context sent was 125 kB. |
| `service.yaml` | The Cloud Run (Knative) service: `maxScale` 2, `minScale` 0, `containerConcurrency` 20, 30 s timeout, 1 CPU throttled outside requests, 512Mi, no volume, env `AFTERLIFE_MODE=replay` only. |
| `deploy.sh` | Prints the operator's commands (build, image check, push, `services replace`, `allUsers` invoker binding, `curl -I`). It runs none of them. |
| `cloudbuild.yaml` | Builds the same Dockerfile on Cloud Build (no local Docker) and pushes the image. |
| `replay.gcloudignore` | The upload filter for `gcloud builds submit`: the `Dockerfile.dockerignore` set with root-only entries anchored (gitignore syntax would otherwise drop `src/server/gitlab/__fixtures__/docs/` and fail the build). |

### Live service (deployed 2026-10-26)

**https://afterlife-replay-731858830008.europe-west1.run.app** - project `gen-lang-client-0334944767`, region `europe-west1`,
service `afterlife-replay`, image in Artifact Registry `europe-west1-docker.pkg.dev/gen-lang-client-0334944767/belay/afterlife-replay`.
Public through the `allUsers` invoker binding; env `AFTERLIFE_MODE=replay` only; `maxScale` 2, `minScale` 0, concurrency 20.

Redeploy after a commit (from the repo root, Git Bash; builds on Cloud Build, then applies `service.yaml`):

```sh
P=gen-lang-client-0334944767 R=europe-west1 IMG=europe-west1-docker.pkg.dev/gen-lang-client-0334944767/belay/afterlife-replay:$(git rev-parse --short HEAD) && gcloud builds submit --project=$P --region=$R --config=infra/cloudrun/cloudbuild.yaml --ignore-file=infra/cloudrun/replay.gcloudignore --substitutions=_IMAGE=$IMG . && sed "s#IMAGE_URL#$IMG#" infra/cloudrun/service.yaml > /tmp/service.rendered.yaml && gcloud run services replace /tmp/service.rendered.yaml --project=$P --region=$R
```

### Build and deploy (operator)

Build and check locally, from the repo root:

```sh
docker build -f infra/cloudrun/Dockerfile -t afterlife-replay .
docker run --rm -e PORT=8080 -p 8080:8080 afterlife-replay  # then: curl -I http://localhost:8080/
docker run --rm afterlife-replay env | grep -E '^(AFTERLIFE|BELAY)_|TOKEN'   # only AFTERLIFE_MODE=replay
```

Deploy: `PROJECT_ID=<project> sh infra/cloudrun/deploy.sh` prints the commands (optional `REGION`, default
`europe-west1`, `REPOSITORY`, default `belay` (the registry repository keeps the name it was created
under), and `TAG`, default the short commit). Read them, then run them yourself.
The service is public through the `allUsers` `roles/run.invoker` binding: there is no login (see the contract).

The lock needs fixing at the repo root: the committed `package-lock.json` lacks `@emnapi/runtime` and `@emnapi/core`
(needed by the optional `@img/sharp-wasm32`), and a Linux `npm ci` refuses it (`Missing: @emnapi/runtime@1.11.3 from lock
file`). Until it is regenerated, the Dockerfile's deps stage runs `npm install --package-lock-only` first, which adds only
the missing entries and keeps every pinned version, then `npm ci`.

## The replay's security contract

On the public URL there is no login: every route and each of the five server actions (`previewAction`, `confirmAction`,
`repollAction`, `verifyArmAction`, `rereadSetupAction`) answers anyone. The replay is safe because it is demo mode on
every path. These must stay true for the public build (scan of 2026-10-09, F91-F99):

1. **`AFTERLIFE_MODE=replay`, never `live`.** Any value but `live` is demo (`src/server/data/config.ts:18`). In demo no action
   spawns a process, opens the index (PGlite), reaches the network, writes a file, polls or executes; boot starts nothing
   (`src/server/data/boot.ts:8`). `src/server/actions/__tests__/replay/inert.test.ts` proves it for replay, demo and unset.
2. **No credential in the image or its environment**: no `glab` binary or glab config, no `AFTERLIFE_BOT_TOKEN` (F4 is accepted
   for M1 only), no GitLab token of any kind, no `AFTERLIFE_*` (or `BELAY_*`) beyond `AFTERLIFE_MODE`. Demo reads none of them (F93).
3. **Entry point** (F24): the standalone `node server.js` with `HOSTNAME=0.0.0.0` and `PORT=$PORT` (F24), never `npm start`,
   and never `next dev` (dev shows real error messages, stacks and its overlay).
4. **No volume**: replay opens no index, so `AFTERLIFE_DATA_DIR` stays unset and nothing needs to be writable.
5. **Keep Next's 1MB server action body limit**: `serverActions.bodySizeLimit` stays unset in `next.config.ts`.
6. **Cap the spend on Cloud Run**: the app has no rate limit, so `max-instances` and `concurrency` are the bound (F99).

## Findings and residuals

| Id | Severity | Where | Proof | State and residual |
|---|---|---|---|---|
| F91 | Medium | `src/server/actions/local.ts:30-42` | test | Fixed (ef55a22). A container started in live mode by mistake behind Cloud Run's front end or a load balancer's default route got the Host the caller chose, so `Host: localhost` passed `notLocal`. A forwarded-for address that is not loopback is now refused. Residual: a proxy that rewrites Host to loopback and adds no forwarding header (nginx's default) still passes; never front a live Afterlife with a proxy or tunnel. |
| F92 | Low | `src/server/actions/intents.ts:24` | test | Fixed (b25cb1e). A gap preview's cost followed a new file's line count: 8 files of 64K newlines cost about 60 ms of CPU and a 4 MB answer per anonymous call. A new file is now at most 2000 lines; the worst case left is about 1.6 MB out for 0.5 MB in, under 15 ms. |
| F93 | Low | `src/server/actions/deps.ts:27-31` | test | Fixed (28b4265). Demo actions read the server's `AFTERLIFE_*` settings, and a refusal named `AFTERLIFE_POLICY_PROJECT` to any caller. Demo now reads no environment. |
| F94 | Low | `next.config.ts:12-24` | container | Fixed (6129a34), seen on a running server (2026-10-18, the image from `infra/cloudrun/Dockerfile`). `curl -I http://localhost:8080/` answered `HTTP/1.1 200 OK` with `Content-Security-Policy: frame-ancestors 'none'`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` and no `x-powered-by`. `/ladder`, `/fleet` and `/setup` answered 200, an unknown path 404. The worktree build failure did not apply: the image installs its own `node_modules`. |
| F95 | Info | `src/components/shell/fallback/ErrorView.tsx:16-18`, `NotFoundView.tsx:15` | inspection | Accepted. The error view shows `error.message` and `digest`. A production build replaces a Server Component error's message with a generic one (Next's `error.md`), and a client error's message is the visitor's own browser's. No stack is shown. Not-found echoes the path, escaped by React. |
| F96 | Info | `src/app/features/settings/components/AboutSection.tsx:13` | inspection | Accepted. Settings shows the app version from `package.json` (the repo is public). No commit, local path or environment value is rendered: in demo the layout and Door read only `AFTERLIFE_MODE`, and Setup reads nothing. |
| F97 | Info | `next.config.ts` | container (experiment) | Open, verified-possible. There is still no script-src CSP in the app. A throwaway copy (outside the repo) added a `src/proxy.ts` sending `script-src 'self' 'nonce-…' 'strict-dynamic'; object-src 'none'; base-uri 'self'; form-action 'self'` and passed the nonce (from `x-nonce`) to the two inline boot scripts (`TextSizeBoot`, `DoorFitBoot`). In its container `/`, `/fleet`, `/ladder`, `/setup`, `/needs-you`, `/settings/display`, `/theater` (200) and an unknown path (404) served 17-22 `<script>` tags each, every one carrying the header's nonce. Not checked in a browser (no CSP violation report was read). Two things to carry into the real change: the proxy's CSP replaced the `next.config.ts` header, so `frame-ancestors 'none'` must move into it, and a nonce needs every page dynamic. HSTS is not set either: `*.run.app` is HSTS-preloaded, so a custom domain needs it. |
| F98 | Info | `src/server/data/policy.ts:42-46` | container | Fixed (the replay Dockerfile). The image copies `policy/` to `/app/policy`, beside `server.js`. The Ladder page's server payload carried `"policy":{"profile":"standard","startTier":"assisted","cooldownDays":7,…,"toHandsOff":{"accepted":15,"noEditRatio":0.9,"cleanDays":14,…}}`. The control, the same image with `policy/` removed, sent `"policy":null` and logged `belay: no trust policy from /app/policy/trust-policy.yml: ENOENT`. |
| F99 | Info | the five actions | test (F92 numbers) | Accepted residual, bounded. A demo preview echoes its intent about 3 times over (the commands, their display and the whole new file, F84), and nothing in the app rate-limits it. `service.yaml` caps the spend: `maxScale` 2 and `containerConcurrency` 20 (at most 40 requests in flight), 30 s timeout, 1 CPU throttled outside requests, `minScale` 0. Seen only in the file until the operator deploys it. |
| F24 | - | the replay's entry point | container | Fixed (the replay Dockerfile). `CMD ["node", "server.js"]` with `HOSTNAME=0.0.0.0` and `PORT` from the environment. `docker run -e PORT=8080 -p 8080:8080` logged `Network: http://0.0.0.0:8080` and answered from the host. No `npm start` (loopback only) and no `next dev`. |

### What the image holds (2026-10-18)

Recorded before the rename, so the names below are the ones the image had then (`BELAY_MODE` is now `AFTERLIFE_MODE`).


`docker run --rm belay-replay env` listed `BELAY_MODE=replay`, `HOME=/home/node`, `HOSTNAME=0.0.0.0`,
`NEXT_TELEMETRY_DISABLED=1`, `NODE_ENV=production`, `NODE_VERSION=24.22.0`, `PATH`, `PORT=8080`, `PWD=/app`, `YARN_VERSION`:
no other `BELAY_*`, no `BELAY_DATA_DIR`, no token. `id` is `uid=1000(node)`, `command -v glab` finds nothing, the home
directory holds only the shell profiles, the image declares no volume, and `/app`, `server.js` and `policy/` are
root-owned (`touch` on each: `Permission denied`). The standalone trace also copies 56 server
source files (`src/server/index/**`, the PGlite migrations, and `engine/`): the repo is public and replay never opens the
index, so they are not a leak.
