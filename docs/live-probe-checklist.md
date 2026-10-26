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
