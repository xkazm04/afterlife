# Monitor (`/monitor`)

> What is waiting for a person right now, and which project is it on?

## What it does
- Shows the fleet as one phosphor "lead" per GitLab group, with every project a beat along its lead. The beat's shape
  says the project's state; amber pips on the R peak are its waiting decisions (at most six drawn, the count says the
  rest).
- The answer band at the top gives the amber headline (decisions waiting and who holds the most) and a HUD readout
  naming whatever the pointer or keyboard is on (a beat or a lead).
- The sidebar lists six marks (Needs you, Stale, Quarantined, Setting up, Not watched, Watching) that light their beats
  across every lead, and the leads themselves; clicking a lead (or Enter) opens it into named cells while the other
  leads shrink to thin traces.
- The inspector shows a fleet overview when nothing is picked (decisions, stale, quarantined, the eight projects
  waiting most). For a picked project it shows its state line, vitals, the items waiting, its signal (stage ticks, tier
  counts, feed age) and exits to Fleet, Needs you, Ladder, Maturity, Cycles and Theater.
- On the deep project each decision has a primary and a quiet button; other projects with decisions link to **Review
  in Needs you** and **Show in Fleet**; a not-watched project offers **Set up…** (`/setup`); a stale project offers
  **Re-poll feed**.
- The toolbar's **Sweep** toggle pauses or resumes the sweep animation.

## How it works
- `src/app/monitor/page.tsx` (server) renders `MonitorScreen` with `loadMonitorData()`.
- `data/loadMonitorData.ts` reads the DataSource into `MonitorData`: org and as-of time, groups, projects, stages, the
  deep project id, its needs-you items and the last poll age.
- Pure model (`model/`):
  - `totals.ts`: `isLive`, `isQuarantined`, `liveNeeds` (0 for a not-set-up project), `MARKS` / `markTest`,
    `leadsOf(groups, projects)` (one lead per group with counts), `totalsOf`, `topWaiting`, and the words
    `stateLine`, `leadLine`, `beatLabel`, `decisionsWord`.
  - `beat.ts`: the beat grammar as geometry. `amplitude` (R height grows with armed tracks 0..8; setting up is a low
    beat), `beatPath`, `qDipPath` (rose Q dip for a quarantined class), `slotsAlong`, `leadPaths` (routes each state to
    one of seven path strings: live, forming, stale ghost, flat, unknown, ticks, Q dips), `peakX`, `pipCount`.
  - `types.ts`: `MonitorData`, `Lead`, `Totals`, `MarkKind`.
- `hooks/useMonitor.ts` holds the client copy of the projects plus selection (defaults to the deep project), open
  lead, lit mark, hover, `resolve` and `repoll`. `hooks/useSize.ts` measures a strip so its paths are rebuilt only
  when its width changes.
- Components draw the model: `Leads` (rows, arrow keys), `LeadStrip` (one lead as about ten SVG paths), `LeadCells`
  (the open lead), `AnswerBand`, `MonitorInspector` and `Decisions`, plus the shared kit `Window`,
  `InspectorSection`, `Stats`, `StageTicks`, `FeedAge`, `TierMark` and `NeedsYouBadge`.

## Rules it keeps
- Unknown is never zero: a not-watched project draws a dashed break with end ticks, never a flat line; its decisions
  are neither drawn nor added to any total; its readout says "not watched · unknown, not zero" and the inspector says
  proofs, tiers and stages are unknown.
- Stale says why: a flat line over hatching with a ghost of the last beat, the feed error (or the age of the last good
  poll) in words, and its decision count marked "(last known)".
- Quarantine is counted only on live projects (watching or setting up).
- Nothing is written. Resolving a decision (deep project only, once per decision, never below zero), re-polling and the
  sweep change only this screen's state. Re-poll fails with a reason on an unwatched project or a broken feed.
- The deep project's decision buttons carry the exact effect (`does`) as their tooltip; the result is echoed in the
  status toast.

## Code map
| Path (under src/app/features/monitor/) | Role |
|---|---|
| `MonitorScreen.tsx` | Composes the Window: Sweep toggle, sidebar, answer band, leads, inspector, status, legend |
| `data/loadMonitorData.ts` | Server loader through the DataSource |
| `model/totals.ts` | Counts, marks, leads, readout words |
| `model/beat.ts` | Beat grammar as SVG path geometry |
| `model/types.ts` | `MonitorData`, `Lead`, `Totals`, `MarkKind` |
| `hooks/useMonitor.ts` | Screen state: projects, selection, open lead, mark, hover, resolve, re-poll |
| `hooks/useSize.ts` | Strip width measurement |
| `components/answer/AnswerBand.tsx` | Headline and HUD readout |
| `components/leads/` | `Leads`, `LeadStrip`, `LeadCells` |
| `components/inspector/` | `MonitorInspector` (overview, vitals, signal, exits), `Decisions` |
| `components/MonitorSidebar.tsx`, `MarkGlyph.tsx` | Marks and leads list, mark glyphs |
| `components/MonitorStatus.tsx`, `MonitorLegend.tsx` | Status bar with its own poll ticker, beat grammar legend |

## Tests
- `model/model.test.ts`:
  - totals count states, live decisions and quarantine but never an unwatched project's decisions;
  - one lead per group in group order;
  - `topWaiting` ranking and marks matching their states;
  - stale and unknown said in words (`stateLine`);
  - R amplitude grows with armed tracks and stays low when setting up;
  - a beat path stays inside its slot;
  - each state goes to its own path layer;
  - pips are capped at six and none are drawn for an unwatched project.
- The loader is not in the server parity test.

## Status and limits
- Data comes from `getDataSource()` (`src/server/data`): demo fixture by default, live index with `BELAY_MODE=live`.
- Only the deep project (default `ledgerline`) has real decisions; other projects hand off to Needs you or Fleet.
- The "polled N s ago" counter in the status bar is a local ticker seeded from `lastPollSec` that wraps after 59 s;
  it does not reflect real polls.
- The sweep is off under `prefers-reduced-motion`. Colours are theme tokens only; the screen is drawn for the Ghostwire
  brand.
