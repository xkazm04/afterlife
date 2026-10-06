# src/server/data - the DataSource (module B6)

Every screen's server loader reads through one interface, `DataSource` (`types.ts`). It has the surface `@/lib/demo` always
had (`getFleet`, `getPortfolio`, `getStages`, `getTiers`, `getTracks`, `getActionClasses`, `getMaturity`, `getLoop`, `getTasks`,
`getNeedsYou`, `getNeedsYouCount`, `getSetup`, `getEvents`, `getCockpit`) plus `mode` and `deepProjectId()`. Reads are
**synchronous**: the live source serves a snapshot that is rebuilt after every poll, so a page never waits on GitLab or the index.

| Env | Values | Default |
|---|---|---|
| `BELAY_MODE` | `demo`: the fixture. `live`: the index. Anything else (the hosted replay's `replay` too) is demo | `demo` |
| `BELAY_GITLAB` | `glab`: the operator's own login. `fake`: the seeded fake group `acme-lab` (live mode with no real group) | `glab` |
| `BELAY_PROJECT` | the project the deep screens are about | `ledgerline` |
| `BELAY_POLL_SECONDS`, `BELAY_GROUP_ID`, `BELAY_DATA_DIR` | see `../poller`, `../gitlab`, `../index` | 30, 144060371, `.belay/` |

`getDataSource()` is chosen per call from the environment of the running server, so the build's environment never matters.
`layout.tsx` is `force-dynamic` for that reason: no page is prerendered.

## Files

| File | What it is |
|---|---|
| `select.ts` | `getDataSource()`, and `setDataSource()` for tests |
| `demoSource.ts` | the demo accessors, unchanged |
| `live/liveSource.ts` | the snapshot + the demo catalogue; throws before the first poll has finished (an empty fleet must not pass for real) |
| `live/snapshot.ts` | `buildSnapshot(db, at, deep, catalogue)`: views from `../index` for fleet, action classes, maturity, tasks, needs-you, plus feed age and the group name |
| `live/narrow.ts` | where the screens' types have no "unknown": quarantined for an unknown tier, 9 null rungs for a scan that never ran, an unclassified task is not listed |
| `live/runtime.ts`, `boot.ts` | one port + index + poller + snapshot per process, kept on `globalThis`; started by `src/instrumentation.ts` (`register`) |
| `live/clock.ts`, `ports.ts` | system clock vs the fake group's **replay clock** (polled 14:21:48, read 14:22:00, always) |

## The fake group and parity

`BELAY_GITLAB=fake` starts an in-memory index, seeds it with `seedDemo` (what GitLab cannot express: the other 183 projects,
scan, records, narrative), and polls `gitlab/fake/demo/` (a GitLab built from the demo dataset: ledgerline's MRs, notes,
labels, deployments, policy files and a verifying ledger). The poller's rows then overwrite the seed where they derive the
same values, which `__tests__/parity.test.ts` proves for every loader (`loadFleetData`, `pickNeedsYouDemo`, `loadTasks`,
`loadLadderData`, `loadMaturityData`, `loadSetupData`, `loadTheaterData`). The replay clock pins the countdowns and feed
ages to the demo's moment, so the screens are identical to demo mode, and visibly a replay.

## Live, what is still the demo catalogue

Tracks, the loop, the event feed, the cockpit text (only `feed.lastPollSec` is live), the setup phases and doctor rows
(only group and project are live), the tier meanings and the stage list. The Ladder's seeded ledger, the Task docket's
per-task fixtures (a live task with no fixture is not drawn) and the Needs-you screen (built around five specific items;
`NeedsYouEmpty` is drawn when they are missing) are the screens' own data and unchanged. The footer chip "illustrative demo
data" is a client component and still says so.
