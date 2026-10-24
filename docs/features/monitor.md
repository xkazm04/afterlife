# Monitor (`/monitor`)

> What is waiting for a person right now, and which project is it on?

## What it does
- Shows the fleet as one phosphor "lead" per GitLab group, with every project a beat along its lead. The beat's shape
  says the project's state; amber pips on the R peak are its waiting decisions (at most six drawn, the count says the
  rest).
- The answer band at the top gives the amber headline (decisions waiting and who holds the most), the week's change
  beside the big number (`WeekNote`, from the 28-day trend), and a HUD readout naming whatever the pointer or keyboard
  is on (a beat or a lead); with nothing under it, a line says what the cycle runner's agents spent.
- The sidebar lists six marks (Needs you, Stale, Quarantined, Setting up, Not watched, Watching) that light their beats
  across every lead, and the leads themselves; clicking a lead (or Enter) opens it into named cells while the other
  leads shrink to thin traces.
- The inspector shows a fleet overview when nothing is picked (decisions, stale, quarantined, the eight projects
  waiting most). For a picked project it shows its state line, vitals, its agent-MR stability line (when read), the
  items waiting, its signal (stage ticks, tier counts or "Tiers unknown, not zero", feed age) and exits to Fleet (that
  project's page), Needs you, Ladder, Maturity, Cycles and Theater.
- On the deep project each decision has a primary and a quiet button (demo) or **Decide in Needs you…** (live); other
  projects with decisions link to **Review in Needs you** and **Show in Fleet**; a not-watched project offers
  **Set up…** (`/setup`); a stale project offers **Re-poll feed**.
- The toolbar's **Sweep** toggle pauses or resumes the sweep animation.

## How it works
- `src/app/(app)/monitor/page.tsx` (server) renders `MonitorScreen` with `loadMonitorData()` and, as its own `estate` prop,
  `loadMonitorEstate(data, readDesk())`.
- `data/loadMonitorData.ts` reads the DataSource into `MonitorData`: the mode (demo or live), org and as-of time, groups,
  projects, stages, the deep project id and its own needs-you items (`ownDecisions`).
- `data/loadMonitorEstate.ts` reads beside the fleet (`MonitorEstate`): the agents' spend summed over the metered
  projects (null: not read), each project's agent-MR stability, and the 28-day trend (seeded in the demo).
- Pure model (`model/`):
  - `totals.ts`: `isLive`, `isQuarantined`, `quarOf`, `tiersRead`, `liveNeeds` (0 for a not-set-up project), `TRACKS`,
    `MARKS` / `markTest`, `leadsOf(groups, projects)` (one lead per group with counts), `totalsOf`, `topWaiting`, and
    the words `stateLine`, `leadLine`, `beatLabel`, `decisionsWord`.
  - `beat.ts`: the beat grammar as geometry. `amplitude` (R height grows with armed tracks 0..8; setting up is a low
    beat; null when armed tracks were not read), `beatPath`, `qDipPath` (rose Q dip for a quarantined class),
    `slotsAlong`, `leadPaths` (routes each state to one of seven path strings: live, forming, stale ghost, flat,
    unknown, ticks, Q dips), `peakX`, `pipFoot`, `pipCount`.
  - `mode.ts`: what differs between demo and live (re-poll plan and sentences, the poll-age counter).
  - `nav.ts`: arrow-key stepping beat to beat and lead to lead, skipping empty groups.
  - `types.ts`: `MonitorData`, `MonitorEstate`, `Lead`, `Totals`, `MarkKind`.
- `hooks/useMonitor.ts` holds the client copy of the projects plus selection (defaults to the deep project), open
  lead, lit mark, hover, `resolve` and `repoll`; a fresh snapshot from the route replaces the copy. `hooks/useSize.ts`
  measures a strip so its paths are rebuilt only when its size changes.
- Components draw the model: `Leads` (rows, arrow keys), `LeadStrip` (one lead as about ten SVG paths), `LeadCells`
  (the open lead), `AnswerBand` and `WeekNote`, `MonitorInspector` and `Decisions`, plus the shared kit `Window`,
  `InspectorSection`, `Stats`, `StageTicks`, `FeedAge`, `TierMark` and `NeedsYouBadge`.

## Rules it keeps
- Unknown is never zero: a not-watched project draws a dashed break with end ticks, never a flat line; its decisions
  are neither drawn nor added to any total; its readout says "not watched · unknown, not zero" and the inspector says
  proofs, tiers and stages are unknown. A watched beat whose armed tracks were not read draws the same break, and
  tiers not read say "Tiers unknown, not zero".
- Stale says why: a flat line over hatching with a ghost of the last beat (none when its height was never read), the
  feed error (or the age of the last good poll) in words, and its decision count marked "(last known)".
- Quarantine is counted wherever tiers were read on a watched project, a stale one keeping its last known count; the
  rose Q dip is drawn only on live beats (watching or setting up).
- Demo writes nothing: resolving a decision (deep project only, once per decision, never below zero), re-polling and
  the sweep change only this screen's state. Live claims nothing it did not do: Resolve opens `/needs-you`, and
  Re-poll runs one real poll cycle on the server (`repollAction`), saying "Re-polled <name>" only when it resolved ok,
  else "Re-poll failed · <name> · <reason>" ("no answer" when there is none). Nothing is written to GitLab. Re-poll on
  an unwatched project has nothing to poll in either mode.
- The deep project's demo decision buttons carry the exact effect (`does`) as their tooltip; the result is echoed in
  the status toast.

## Code map
| Path (under src/app/features/monitor/) | Role |
|---|---|
| `MonitorScreen.tsx` | Composes the Window: Sweep toggle, sidebar, answer band, leads, inspector, status, legend |
| `data/loadMonitorData.ts` | Server loader through the DataSource |
| `data/loadMonitorEstate.ts` | Server loader for spend, stability and trend, beside the fleet |
| `model/totals.ts` | Counts, marks, leads, readout words |
| `model/beat.ts` | Beat grammar as SVG path geometry |
| `model/mode.ts` | Demo vs live decisions: re-poll, poll age |
| `model/nav.ts` | Arrow-key stepping |
| `model/types.ts` | `MonitorData`, `MonitorEstate`, `Lead`, `Totals`, `MarkKind` |
| `hooks/useMonitor.ts` | Screen state: projects, selection, open lead, mark, hover, resolve, re-poll |
| `hooks/useSize.ts` | Strip size measurement |
| `components/answer/` | `AnswerBand` (headline and HUD readout), `WeekNote` |
| `components/leads/` | `Leads`, `LeadStrip`, `LeadCells` |
| `components/inspector/` | `MonitorInspector` (overview, vitals, signal, exits), `Decisions` |
| `components/MonitorSidebar.tsx`, `MarkGlyph.tsx` | Marks and leads list, mark glyphs |
| `components/MonitorStatus.tsx`, `MonitorLegend.tsx` | Status bar with its own poll ticker, beat grammar legend |

## Tests
- `model/model.test.ts`: totals, leads, `topWaiting` and marks; stale and unknown said in words (`stateLine`); the R
  amplitude, beat paths, layers per state, the armed-not-read break, pip stems and the six-pip cap.
- `model/mode.test.ts`: re-poll plan and sentences per mode, "no answer" for an empty reason, the poll-age counter.
- `model/nav.test.ts`: arrow keys over empty groups.
- `hooks/useMonitor.test.ts`: one server re-poll per feed at a time.
- Components: `MonitorStatus`, `MonitorLegend`, `AnswerBand`, `Decisions`, `MonitorInspector`, `Leads` (key handler
  and render).
- `loadMonitorData` is covered in live mode by `src/app/features/door/data/loadDoorData.live.test.tsx`, and its
  `ownDecisions` call by `src/server/data/__tests__/seeded/seededOnce.test.ts`.

## Status and limits
- Data comes from `getDataSource()` (`src/server/data`): demo fixture by default, live index with `BELAY_MODE=live`.
- Only the deep project (default `ledgerline`) has real decisions; other projects hand off to Needs you or Fleet.
- The "polled N s ago" counter in the status bar ticks locally from the deep project's own feed age ("no good poll
  yet" when it has none). Demo loops it at 60 s; live never wraps, and a fresher snapshot (a live re-poll, a reload)
  restarts it.
- The sweep is off under `prefers-reduced-motion`. Colours are theme tokens only; the screen is drawn for the Ghostwire
  brand.
