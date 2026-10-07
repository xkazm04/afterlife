# src/server/data - the DataSource (module B6)

Every screen's server loader reads through one interface, `DataSource` (`types.ts`). It has the surface `@/lib/demo` always
had (`getFleet`, `getPortfolio`, `getStages`, `getTiers`, `getTracks`, `getActionClasses`, `getMaturity`, `getLoop`, `getTasks`,
`getNeedsYou`, `getNeedsYouCount`, `getSetup`, `getEvents`, `getCockpit`) plus `mode`, `deepProjectId()` and
`illustrative` (the demo narrative it serves beside live data, for the screens to label) and `getPolicy()` (trust-policy.yml's
rules: the promotion thresholds, the demotion triggers, the envelope). Reads are
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
| `live/snapshot.ts` | `buildSnapshot(db, at, deep, catalogue)`: views from `../index` for fleet, action classes, maturity, tasks, recent events, needs-you, plus feed age and the group name |
| `live/narrow.ts` | where the screens' types have no "unknown": quarantined for an unknown tier, 9 null rungs for a scan that never ran, an unclassified task is not listed |
| `live/runtime.ts`, `boot.ts` | one port + index + poller + snapshot per process, kept on `globalThis`; started by `src/instrumentation.ts` (`register`) |
| `live/clock.ts`, `ports.ts` | system clock vs the fake group's **replay clock** (polled 14:21:48, read 14:22:00, always) |

## The fake group and parity

`BELAY_GITLAB=fake` starts an in-memory index, seeds it with `seedDemo` (what GitLab cannot express: the other 183 projects,
scan, records, narrative), and polls `gitlab/fake/demo/` (a GitLab built from the demo dataset: ledgerline's MRs, notes,
labels, deployments, policy files and a verifying ledger). The poller's rows then overwrite the seed where they derive the
same values, which `__tests__/parity.test.ts` proves for every loader (`loadFleetData`, `pickNeedsYouDemo`, `loadLadderData`, `loadMaturityData`, `loadSetupData`, `loadTheaterData`; `loadTasks` is listed where live differs from demo: live draws only the source's tasks). The replay clock pins the countdowns and feed
ages to the demo's moment, so the screens are identical to demo mode, and visibly a replay.

## Live, what is still the demo catalogue

Tracks, the loop, the cockpit text (only `feed.lastPollSec` is live), the setup phases and doctor rows
(only group and project are live): the live source declares these in `illustrative` (`tracks`, `loop`, `cockpit`,
`setup`), and the Door and Fleet mark what they show of them "demo" (the demo source declares nothing: all of it is the
demo). It also declares what the Ladder still shows of the demo: `policy-history` (its opening ledger, the tier-state.yml
head, the policy's revision and merge age, and the commit ids they name: the poller reads belay-policy's files, never its
history) and `records` (the class records' counters: GitLab cannot restate them, so the poller keeps the seed's). The
Ladder marks each with the kit's `Chip` ("demo"); a class with no record says "No record yet". The tier meanings are the product's tier vocabulary, the same in every mode, and are not marked. The stage list is
the schema's (`@/schemas/stages`). The Task docket's per-task fixtures are the screen's own render detail for a live task that has one; a fixture with no
source task is not drawn in live mode, and a live task with no fixture is drawn from its own fields. Needs you never draws its desk in live mode (it is built around the demo's
five seeded items): it lists the group's own open items, minus any the demo seeded, or `NeedsYouEmpty`.

`getPolicy()`: demo, this checkout's `policy/trust-policy.yml` (`policy.ts`, checked by the engine's parser); live, the
trust-policy.yml the last poll read from belay-policy (`CycleResult.policy`, kept on the snapshot; a cycle that could
not read one keeps the last good one). Null until one was read: the Ladder then draws no counts and says why. The footer chip "illustrative demo
data" is a client component and still says so.

The recent events are the index's own (`getEvents` in `../index/views/events.ts`): a task's MR opened and merged, the last
poll, and each task's standing (state, proof verdict) on its newest row. They are not the demo's feed, so the Fleet reads
them through `loadFleetSource`, beside `loadFleetData`, and `parity.test.ts` lists them where live differs from demo.
