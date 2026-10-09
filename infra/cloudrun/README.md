# Google Cloud deployment (DECISIONS.md D5)

- **Demo bank** (`ledgerline`, its own repo): review apps per MR, `staging` and `production`
  services on Cloud Run, deployed by the pipeline with OIDC (Workload Identity Federation), no
  stored keys. Terraform state managed by GitLab, which also covers the Configure stage.
- **Belay hosted replay**: this app's standalone build with `BELAY_MODE=replay`, serving a ledger
  snapshot read-only, with no tokens and no write path. It is the public live link for judges and
  must stay up until about 16 November.

The Terraform lands in week 2. The deployment code must be in the public repo for the +0.2 bonus.
- The hosted replay container (`BELAY_MODE=replay`, no tokens, no write path) must listen on `0.0.0.0:$PORT` through its own entry point, and must not use `npm start`, which binds loopback only (F24).

## The replay's security contract

On the public URL there is no login: every route and each of the five server actions (`previewAction`, `confirmAction`,
`repollAction`, `verifyArmAction`, `rereadSetupAction`) answers anyone. The replay is safe because it is demo mode on
every path. These must stay true for the public build (scan of 2026-10-09, F91-F99):

1. **`BELAY_MODE=replay`, never `live`.** Any value but `live` is demo (`src/server/data/config.ts:18`). In demo no action
   spawns a process, opens the index (PGlite), reaches the network, writes a file, polls or executes; boot starts nothing
   (`src/server/data/boot.ts:8`). `src/server/actions/__tests__/replay/inert.test.ts` proves it for replay, demo and unset.
2. **No credential in the image or its environment**: no `glab` binary or glab config, no `BELAY_BOT_TOKEN` (F4 is accepted
   for M1 only), no GitLab token of any kind, no `BELAY_*` beyond `BELAY_MODE`. Demo reads none of them (F93).
3. **Entry point**: the standalone `node server.js` with `HOSTNAME=0.0.0.0` and `PORT=$PORT` (F24), never `npm start`,
   and never `next dev` (dev shows real error messages, stacks and its overlay).
4. **No volume**: replay opens no index, so `BELAY_DATA_DIR` stays unset and nothing needs to be writable.
5. **Keep Next's 1MB server action body limit**: `serverActions.bodySizeLimit` stays unset in `next.config.ts`.
6. **Cap the spend on Cloud Run**: the app has no rate limit, so `max-instances` and `concurrency` are the bound (F99).

## Findings and residuals

| Id | Severity | Where | Proof | State and residual |
|---|---|---|---|---|
| F91 | Medium | `src/server/actions/local.ts:30-42` | test | Fixed (ef55a22). A container started in live mode by mistake behind Cloud Run's front end or a load balancer's default route got the Host the caller chose, so `Host: localhost` passed `notLocal`. A forwarded-for address that is not loopback is now refused. Residual: a proxy that rewrites Host to loopback and adds no forwarding header (nginx's default) still passes; never front a live Belay with a proxy or tunnel. |
| F92 | Low | `src/server/actions/intents.ts:24` | test | Fixed (b25cb1e). A gap preview's cost followed a new file's line count: 8 files of 64K newlines cost about 60 ms of CPU and a 4 MB answer per anonymous call. A new file is now at most 2000 lines; the worst case left is about 1.6 MB out for 0.5 MB in, under 15 ms. |
| F93 | Low | `src/server/actions/deps.ts:27-31` | test | Fixed (28b4265). Demo actions read the server's `BELAY_*` settings, and a refusal named `BELAY_POLICY_PROJECT` to any caller. Demo now reads no environment. |
| F94 | Low | `next.config.ts:12-24` | test (config only) | Fixed (6129a34). `x-powered-by: Next.js` is gone; every path sends `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`. Not seen on a running server: `next dev` and `next build` both fail in a builder worktree (the `node_modules` junction points out of Turbopack's root). Check them with `curl -I` on the first real build. |
| F95 | Info | `src/components/shell/fallback/ErrorView.tsx:16-18`, `NotFoundView.tsx:15` | inspection | Accepted. The error view shows `error.message` and `digest`. A production build replaces a Server Component error's message with a generic one (Next's `error.md`), and a client error's message is the visitor's own browser's. No stack is shown. Not-found echoes the path, escaped by React. |
| F96 | Info | `src/app/features/settings/components/AboutSection.tsx:13` | inspection | Accepted. Settings shows the app version from `package.json` (the repo is public). No commit, local path or environment value is rendered: in demo the layout and Door read only `BELAY_MODE`, and Setup reads nothing. |
| F97 | Info | `next.config.ts` | none | Open. There is no script-src CSP. It could not be verified (same build failure as F94), and a wrong one breaks the app's inline scripts. Add it with a nonce once a real build can be checked. HSTS is not set either: `*.run.app` is HSTS-preloaded, so a custom domain needs it. |
| F98 | Info | `src/server/data/policy.ts:42-46` | inspection | Open (M4). Demo reads `<cwd>/policy/trust-policy.yml` once, a fixed path. The image must ship `policy/` beside `server.js`, or the Ladder draws no thresholds (no leak, a blank). |
| F99 | Info | the five actions | test (F92 numbers) | Accepted residual. A demo preview echoes its intent about 3 times over (the commands, their display and the whole new file, F84), and nothing in the app rate-limits it. Cloud Run's `max-instances` and `concurrency` are the cost bound (contract item 6). |
