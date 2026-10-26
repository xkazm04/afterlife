# Set up my first project (`/start`)

> From this machine to a watched project: what is done, what is being checked right now, and what is next?

## What it does
- One wizard of eight steps, drawn as a constellation: **this machine** glows at the centre, the steps sit on an orbit
  grouped by place (this machine, GitLab, Afterlife): **Pick a repo**, **glab**, **Signed in**, **Group**, **Live**,
  **Stack**, **Save**, **Unlock map**.
- Repo first: picking a repo reads its git remote, which names the GitLab host and group, so the group id is filled in
  instead of asked for. With no local repo (or a request from another machine) the group step takes a typed id.
- Every check is visibly in progress: the link to a step being checked flows, its node breathes, and the caption says
  `checking glab login… 4 s` (after 12 s, "still waiting on GitLab"). Each step lights the moment its own result lands.
- The shape builds up: the orbit's arc between two neighbouring steps draws in once both are done; the closing arc
  lights only when every step is done, and the whole picture completes.
- Pressing a node grows its card out of it (Esc folds it back): the step's one line, **Copy command**, and **Run it**.
- Two paths, one action list: **By hand** (copy the command, or Run it) or **With Afterlife**, a chat drawer that reads
  the steps and proposes the next action. Either way the server shows the exact command first and runs it only on your
  confirm. The actions: install glab (winget / brew), open a terminal window running `glab auth login` (Afterlife never
  sees the token), set the group and live mode, and save the project.
- Setting the group or live mode needs no restart: the values are runtime settings and the live runtime restarts
  in-process. A variable set in the environment always wins, and the step says so.
- `/trace` and `/onboard` redirect here. In live mode before the first poll, or with an empty group, every screen shows
  this one instead of an error page.

## How it works
- `app/(app)/start/page.tsx` reads the facts the server knows without probing (`features/start/gate/facts.ts`) and the
  local repos (`gate/repos.ts`, this machine only). `features/start/hooks/useStart.ts` composes the stream, the repo,
  the stack, the pending action and the chat into one `StartView` (`model/view.ts`); the steps are derived on every
  render (`model/steps/derive.ts`), never stored. `constellation/` draws it (`sky.ts` holds the geometry and the arcs).
- `GET /api/start/probe` streams NDJSON (`model/types.ts` `ProbeEvent`): the preflight nodes as they are decided, then
  each capability row as it settles, then `done` (`features/start/data/probe.ts`, `probeCapabilities` hooks).
- `POST /api/start/derive` reads the repo's remote and the group id; `POST /api/start/ask` asks claude with no tools and
  keeps only an action from the catalogue (`server/discover/ask/`); `POST /api/start/save` saves the confirmed lines.
- The setup actions are intents (`install-glab`, `glab-login`, `set-setup`, `server/start/wire.ts`) planned and run by
  `server/actions/setup/` through `previewAction` / `confirmAction`, loopback only, in demo mode too.
- Runtime settings live in `<data dir>/settings.json` (`server/env/settings.ts`); `serverEnv()` lays them under the env
  (`AFTERLIFE_*`, then the deprecated `BELAY_*`). `restartRuntime()` (`server/data/live/runtime.ts`) restarts the live
  runtime, and `scope.ts` keeps the snapshot to the watched group's projects.

## Honesty
- Demo and the seeded fake GitLab say so in chips; nothing probed is shown as unknown, never as zero.
- Amber means a step waits for you; a blocked check is red with the command (and Run it) that clears it.
