# Live probe checklist

What the screen-host rollout could not verify on demo data or `AFTERLIFE_GITLAB=fake`: run each item against a real
GitLab group (`AFTERLIFE_MODE=live`) and check what it says. One section per module; append yours, do not rewrite another's.

## Cycles (W3)

- Live, after a poll: `/cycles` paints the window and the stage rows at once, then fills from the deep project's ledger
  (`belay-ledger/cycles/<id>.jsonl`). The answer band's replay proof and chain proof read the live history.
- `/cycles?scope=estate` with several projects in cycles: the rows land first, then each project's "Every cycle" (the
  `estateCycles` line). `curl -N "http://127.0.0.1:<port>/api/screen/cycles?scope=estate"` shows `core` empty, then
  `estate`, then `estateCycles`, then `_end`.
- Live before the first poll: the pane says "The cycles could not be read: ..." and every value stays a dash.

## Onboard estate (W3)

- `/onboard/estate` live: confirm a batch's writes; the screen re-reads the estate and the session's moved projects stay
  where the session put them unless the data shows them further along.
- (The W3 wizard at `/onboard` is gone: it is `/start` now, see "/start and the live gate" below.)

## Setup (W3)

- `/setup` live: the window paints at once with dashes for the step, track and capability states, the counts and the
  doctor lozenge, and no amber "need you" before the steps are read.
- Tracks, doctor and steps fill independently as each GitLab read resolves; once all three land the counts equal the
  old whole-read page (same "N need you", same armed and ready).
- Kill the network or log out of glab: each failed read shows unknown with its reason, or "afterlife doctor could not
  be read", never a frozen dash.
- Arm a track, then return to the map: the open MR stays open after the re-read.
- `/setup/cap-<a label the doctor does not report>` shows the not-found card once the doctor lands.
- A node click (node to node) reads only the catalogue (`_slices=catalogue`): the three live reads, the 11-probe doctor
  included, stay as read; the map to a node, and back to the map, still read them (another key). Note how long each fills.

## Task (W3)

- `AFTERLIFE_MODE=live` before the first poll: `/task/<id>` shows "The task could not be read: ..." in the pane; the docket
  and status stay dashes; the window is not blank.
- Live, after a poll: `/task` redirects to the first task of the group's docket; a group with no tasks shows "No task is
  held in the docket yet" inside the Task window.
- The Ledger tab shows the merge request's slice of the real chain, labelled sha256-checked; Replay enables only after
  the ledger line lands; an empty slice reads "no rows", never a dash once read.
- The subtitle names the group / project, and the poll age counts up from the page's value.
- `curl -N "http://127.0.0.1:<port>/api/screen/task%2F%5Bid%5D?id=<id>"` returns docket, detail, ledger and page lines,
  then `_end`; an unknown id answers a notFound line.

## /start and the live gate (merge of main: Trace and the Onboard wizard became /start)

- `/start` on localhost with a cold process: the window, its title and Re-check paint in the click's frame (dashes);
  the wizard mounts when `facts` lands and its probes stream as before (`/api/start/probe`); "Your repos" is a dash in
  the picker until `repos` lands (`listClaudeRepos`: a git per repo on the first call, then 60 s cached).
  `curl -N "http://127.0.0.1:<port>/api/screen/start"` shows `facts` first, then `repos`, then `_end`.
- `/start` through a non-local address (a tunnel, the hosted replay): the repo step says "Setup runs on your own
  machine ..." and lists nothing; `/api/screen/start` answers `repos` with `reason: not-local`, `facts` as usual.
- Pick a repo, leave for another screen while the stack is proposed (about a minute), come back: the run is still going
  (or done), the clock counts from the ask, nothing was aborted. The probe runs again on each return.
- Save the stack: the probe re-checks and the screen re-reads (the saved repo reads Onboarded).
- Start with `AFTERLIFE_MODE=live` and a slow or failing first poll, hard load `/monitor`: the gate (a server read in the
  (app) layout, `start/gate/LiveGate.tsx`, main's) covers the column with /start. Host clicks in the sidebar keep the
  cover (the layout is not re-read on a host click); on `/start` itself the host's copy draws nothing under the cover.
- Let the first poll finish, then Re-check on the cover: when the live node passes, the router refreshes the layout (the
  cover lifts), the host's screen under it re-reads (`hostRevalidate`) and the shell re-reads (`requestShellRead`), with
  no reload. Not verified: whether a host-only session (no router navigation) ever lifts the cover without that Re-check.
- `/start?rehearse=not-ready` on a ready server: the rehearsal chip and the gate copy; `/trace` and `/onboard` redirect
  to `/start` (next.config.ts).

## Theater and Runs (W4)

- With a real `.afterlife/fleet.yml` and checkouts: `/theater` paints the window at once; "New run…" joins the toolbar when
  the `start` line lands (git, kept 5 s). Start a run: the screen moves to `/theater?live=1` in place (no reload) and the
  live film polls `/api/runs` every 2 s; switching away stops the poll, coming back resumes it.
- `/theater` with a wave running opens the live film; with none, the ledger film (one take per MR on a live ledger).
  `?mr=<n>` films that MR first; `?repo=<r>&wave=<n>` a finished wave on the live screen.
- From a non-local address (a tunnel, the hosted replay): "New run…" is there and says a run starts only from this
  machine; `/api/screen/theater` answers `start` with `reason: not-local`.
- `/runs` with mergeable waves: select one; its card says "Asking git whether it is in already: —" until `merges`
  lands, then the fleet path's commands (or "nothing to merge"). From a non-local address the card shows the slug
  commands and `merges` answers `not-local`.

## Settings and the shell (W4)

- Live: `/settings/data` paints the Connection card with dashes, then `live (AFTERLIFE_MODE=live)`, the real host and group.
- Change "Show demo estate" with a real project saved: the sidebar follows at once (an `/api/shell` read, no reload).
- On the live server, decide an item on Needs you, then switch screens: the badge follows within about 300 ms of the
  switch (the shell re-reads on host navigation), not only on window focus.

## Fleet and Vitals (W1)

- Live before the first poll: `/fleet` paints the window, toolbar and runner slot with dashes; the table says "The fleet
  could not be read: AFTERLIFE_MODE=live, but the first poll has not finished" and no count is a zero.
- Live, after a poll: right-click a watched project, Re-poll. The status says "Re-polling …", then "Re-polled …", and the
  row's feed age and the status bar's "polled … ago" restart from the fresh snapshot (the screen re-reads through the
  host's revalidate, `/api/screen/fleet` in the network panel, no `?_rsc`).
- A real runner checkout (`.afterlife/fleet.yml` with repos and runs, git branches to ask): the strip's slot shows dashes,
  then fills after `readDesk` (seconds on a cold git) without moving the table; `curl -N /api/screen/fleet` shows `core`
  first, `desk` last.
- `/fleet/<a live project id>`: the cards fill from `core`; Stability and Trend from the live index; Agent cost from the
  runner. An id the group does not have shows "Project not found".
- `/vitals` with real onboarded projects (`.afterlife/projects`): the rows paint from their configs, then Last collected and
  Runs stored fill per row (the ci-runs jsonl). Open it through a tunnel or another host: "Only on this machine." and no
  project names.
- `/vitals/<slug>` with runs older than 15 minutes: one collect starts on open (Refresh disabled, "collecting, started
  …"), the screen re-reads every 5 s until the job is done, then the bands show the new runs. Leave for another screen
  and come back within 15 minutes: no second collect. Return after the job failed (an expired `az login`): the
  re-login command shows, no collect starts until Refresh.
- On an adjustment with a queue re-measure: Queue N runs, confirm; after "done" the screen re-reads (the claim shows its
  queued state). Measure passively: the measurement shows in the band without a reload.

## Needs you, Ladder, Maturity (W2)

- Needs you, live with open items: `/needs-you` paints the live desk's window (By kind / By project / By deadline,
  Outbox) in the click's frame (the shell's mode decides before the view lands), then the band and the table fill. Leave
  and come back: every region shows "as of HH:MM:SS · re-reading" and is inert until the fresh read lands; a proposal
  acted on in GitLab meanwhile is gone from the fresh rows. `curl -N "http://127.0.0.1:<port>/api/screen/needs-you"`:
  `view` first, `desk` (readDesk) after it.
- Needs you, live with none: the empty state in the same window, the seeded count named. A Ladder `p` on an eligible
  class opens `/needs-you?item=<id>`; a second visit with another `?item=` selects that one.
- Needs you, live: `/needs-you/<anything>` is "Decision not found" (only the demo's desk has pages).
- Ladder, live, a real revoke: the row stays "pending" across list and class page, the 15 s re-read (no route refresh)
  settles it once a gated MR read the commit; the list and the class page agree throughout.
- Ladder class page, live: the human key line arrives after the cards (`humanKey`, a GitLab GET); a slow or failing
  GitLab leaves the promotion rule without the line, never blocking the page.
- Ladder, live, a long belay-ledger chain: the rows wait for `ledger` (the opening order is by last move); time it.
- Maturity, live: a new scan between visits (the poller stores a newer artifact): the crag takes the new rungs and scan
  time on the next visit, the picks and the mode stay.

## Screen host (W5)

- Live, a task j/k step: only `detail` and `ledger` are read (`_slices=detail,ledger`); the docket and the poll age stay
  and are not re-read. After a poll changes the docket, a return to the task (or Re-poll) re-reads it whole.
- Live, `/fleet?project=<a live id>`: the redirect lands on the project; then Monitor, then the sidebar's Fleet: `/fleet`
  with no `?project=` (the redirect's query is dropped).
- Live with a slow GitLab: Back and forward each send one `/api/screen/<key>` request, not two.
- Door's Enter into the app with no `(app)/loading.tsx`: time the router navigation on a cold server (it waits for the
  static shell's RSC; nothing draws in between).
