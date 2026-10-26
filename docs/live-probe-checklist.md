# Live probe checklist

What the screen-host rollout could not verify on demo data or `BELAY_GITLAB=fake`: run each item against a real GitLab
group (`BELAY_MODE=live`) and check what it says. One section per module; append yours, do not rewrite another's.

## Cycles (W3)

- Live, after a poll: `/cycles` paints the window and the stage rows at once, then fills from the deep project's ledger
  (`belay-ledger/cycles/<id>.jsonl`). The answer band's replay proof and chain proof read the live history.
- `/cycles?scope=estate` with several projects in cycles: the rows land first, then each project's "Every cycle" (the
  `estateCycles` line). `curl -N "http://127.0.0.1:<port>/api/screen/cycles?scope=estate"` shows `core` empty, then
  `estate`, then `estateCycles`, then `_end`.
- Live before the first poll: the pane says "The cycles could not be read: ..." and every value stays a dash.

## Onboard (W3)

- `/onboard` on localhost with a cold process: the window, engine control and steps paint at once; "Your repos" fills
  when `listClaudeRepos` answers (a git per repo on the first call, then 60 s cached).
- `/onboard` through a non-local address (a tunnel, the hosted replay): step 1 says "Onboarding runs on your own
  machine ..." and lists nothing; `/api/screen/onboard` answers one `_end` line with `reason: not-local`.
- Start a proposal, leave for another screen for a minute, come back: the run is still going (or done), the proposing
  clock counts from the ask, nothing was aborted. Save, then the saved repo reads Onboarded (the repos re-read).
- `/onboard/estate` live: confirm a batch's writes; the screen re-reads the estate and the session's moved projects stay
  where the session put them unless the data shows them further along.

## Setup (W3)

- `/setup` live: the window paints at once with dashes for the step, track and capability states, the counts and the
  doctor lozenge, and no amber "need you" before the steps are read.
- Tracks, doctor and steps fill independently as each GitLab read resolves; once all three land the counts equal the
  old whole-read page (same "N need you", same armed and ready).
- Kill the network or log out of glab: each failed read shows unknown with its reason, or "belay doctor could not be
  read", never a frozen dash.
- Arm a track, then return to the map: the open MR stays open after the re-read.
- `/setup/cap-<a label the doctor does not report>` shows the not-found card once the doctor lands.
- Each node visit re-runs the three live reads (the 11-probe doctor included): note how long a node click takes to fill.

## Task (W3)

- `BELAY_MODE=live` before the first poll: `/task/<id>` shows "The task could not be read: ..." in the pane; the docket
  and status stay dashes; the window is not blank.
- Live, after a poll: `/task` redirects to the first task of the group's docket; a group with no tasks shows "No task is
  held in the docket yet" inside the Task window.
- The Ledger tab shows the merge request's slice of the real chain, labelled sha256-checked; Replay enables only after
  the ledger line lands; an empty slice reads "no rows", never a dash once read.
- The subtitle names the group / project, and the poll age counts up from the page's value.
- `curl -N "http://127.0.0.1:<port>/api/screen/task%2F%5Bid%5D?id=<id>"` returns docket, detail, ledger and page lines,
  then `_end`; an unknown id answers a notFound line.

## Trace and the live gate (W4)

- Start with `BELAY_MODE=live` and a slow or failing first poll. Open `/monitor`: the Trace cover is over the column as
  soon as the shell's read lands, with "Live · first poll not finished" and the live source's reason (no failed
  Monitor). Switch screens in the sidebar: the cover stays, and on `/trace` itself the screen shows the same gate copy
  once, with no second cover.
- Let the first poll finish, then press Re-check on the cover: when the live node passes, `/api/shell` is read again,
  the cover lifts, and the screen under it re-reads and fills (no reload). Also check that a plain screen switch after the
  poll finished lifts it (the shell re-reads on host navigation).
- A live group with no project: the cover says "Afterlife is watching a group with no project" (from Trace's `facts`
  slice); adding a project and polling lifts it.
- `/trace` live on a real group: the subtitle names `group <id> on <host>`, the source chip "live · glab on <host>", the
  six nodes probe in place; `?rehearse=not-ready` on a ready server shows the rehearsal chip and the gate copy.

## Theater and Runs (W4)

- With a real `.belay/fleet.yml` and checkouts: `/theater` paints the window at once; "New run…" joins the toolbar when
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

- Live: `/settings/data` paints the Connection card with dashes, then `live (BELAY_MODE=live)`, the real host and group.
- Change "Show demo estate" with a real project saved: the sidebar follows at once (an `/api/shell` read, no reload).
- On the live server, decide an item on Needs you, then switch screens: the badge follows within about 300 ms of the
  switch (the shell re-reads on host navigation), not only on window focus.

## Fleet and Vitals (W1)

- Live before the first poll: `/fleet` paints the window, toolbar and runner slot with dashes; the table says "The fleet
  could not be read: BELAY_MODE=live, but the first poll has not finished" and no count is a zero.
- Live, after a poll: right-click a watched project, Re-poll. The status says "Re-polling …", then "Re-polled …", and the
  row's feed age and the status bar's "polled … ago" restart from the fresh snapshot (the screen re-reads through the
  host's revalidate, `/api/screen/fleet` in the network panel, no `?_rsc`).
- A real runner checkout (`.belay/fleet.yml` with repos and runs, git branches to ask): the strip's slot shows dashes,
  then fills after `readDesk` (seconds on a cold git) without moving the table; `curl -N /api/screen/fleet` shows `core`
  first, `desk` last.
- `/fleet/<a live project id>`: the cards fill from `core`; Stability and Trend from the live index; Agent cost from the
  runner. An id the group does not have shows "Project not found".
- `/vitals` with real onboarded projects (`.belay/projects`): the rows paint from their configs, then Last collected and
  Runs stored fill per row (the ci-runs jsonl). Open it through a tunnel or another host: "Only on this machine." and no
  project names.
- `/vitals/<slug>` with runs older than 15 minutes: one collect starts on open (Refresh disabled, "collecting, started
  …"), the screen re-reads every 5 s until the job is done, then the bands show the new runs. Leave for another screen
  and come back within 15 minutes: no second collect. Return after the job failed (an expired `az login`): the
  re-login command shows, no collect starts until Refresh.
- On an adjustment with a queue re-measure: Queue N runs, confirm; after "done" the screen re-reads (the claim shows its
  queued state). Measure passively: the measurement shows in the band without a reload.
