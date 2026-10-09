# src/server/data - the DataSource (module B6)

Every screen's server loader reads through one interface, `DataSource` (`types.ts`). It has the surface `@/lib/demo` always
had (`getFleet`, `getPortfolio`, `getStages`, `getTiers`, `getTracks`, `getActionClasses`, `getMaturity`, `getLoop`, `getTasks`,
`getNeedsYou`, `getNeedsYouCount`, `getSetup`, `getEvents`, `getCockpit`) plus `mode`, `deepProjectId()` and
`illustrative` (the demo narrative it serves beside live data, for the screens to label) and `getPolicy()` (trust-policy.yml's
rules: the promotion thresholds, the demotion triggers, the envelope) and `getLedger()` (the deep project's hash-chained
`LedgerEvent`s, `@/schemas/ledger`, in seq order; see "The ledger" below). Reads are
**synchronous**: the live source serves a snapshot that is rebuilt after every poll, so a page never waits on GitLab or the index.
One exception, Setup: `setupReads()` is a synchronous getter (null in demo mode) for read-only port calls the Setup loader
awaits per load (see `setup/` below).

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
| `live/snapshot.ts` | `buildSnapshot(db, at, deep, catalogue)`: views from `../index` for fleet, action classes, maturity, tasks, recent events, needs-you, plus feed age, the group name and the deep project's ledger (`readLedger` by its row's gitlab id) |
| `live/seeded.ts` | `SEEDED_ITEMS` and `isSeeded(id)`: the ids the demo seeds into an index, which a real group's index never holds. `getNeedsYouCount()` and the deep project's fleet row exclude them, as `/needs-you` does (`getNeedsYou()` still returns them) |
| `live/narrow.ts` | where the screens' types have no "unknown": quarantined for an unknown tier, 9 null rungs for a scan that never ran, an unclassified task is not listed |
| `live/runtime.ts`, `boot.ts` | one port + index + poller + snapshot per process, kept on `globalThis`; started by `src/instrumentation.ts` (`register`) |
| `setup/` | Setup's live reads (`read.ts`): each track's arm block on the target's main (`checkArm`; a track with no arm content is "not defined yet", a refused or failed read is unknown with its reason), the belay doctor (`probeCapabilities` on the configured group, stamped with the real time), and the steps a read observes: 0 (`glab api user`), 1 (the snapshot's pairing row), 4 (the target and belay-pack, -policy, -ledger, -engine in the group). Every other step is unknown, "not probed". `rereadAction.ts` (`'use server'`, localhost only, read only) is Re-probe and a step's verify. `types.ts` is what the screen receives |
| `live/clock.ts`, `ports.ts` | system clock vs the fake group's **replay clock** (polled 14:21:48, read 14:22:00, always) |

## The ledger

`getLedger()` returns the deep project's events (`belay-ledger/events/<gitlab-id>.jsonl`) as the index holds them, in seq
order. Live, `buildSnapshot` reads them once per poll with `readLedger(db, gitlabId)`, the gitlab id from the deep project's
row; a project with no gitlab id, or with no ledger, reads `[]`. The index holds only a chain that verified on import
(`../ledger/importLedger.ts`), so the source does not verify it again. Demo: `[]`: the demo dataset has no ledger, and the
hosted replay reaches no index. Tested in `__tests__/ledger.test.ts` on the fake group (`__tests__/fakeGroup.ts`, the rig
`parity.test.ts` shares): ledgerline's 7 events, which `verifyChain` accepts.

## The fake group and parity

`BELAY_GITLAB=fake` starts an in-memory index, seeds it with `seedDemo` (what GitLab cannot express: the other 183 projects,
scan, records, narrative), and polls `gitlab/fake/demo/` (a GitLab built from the demo dataset: ledgerline's MRs, notes,
labels, deployments, policy files and a verifying ledger). The poller's rows then overwrite the seed where they derive the
same values, which `__tests__/parity.test.ts` proves for every loader (`loadFleetData`, `pickNeedsYouDemo`, `loadLadderData`, `loadMaturityData`, and `loadSetupData`'s catalogue parts; `loadTasks`, the Needs-you count and `loadTheaterData` are listed where live differs from demo: live draws only the source's tasks, and counts only unseeded Needs-you items, so the layout badge and the deep project's Fleet and Door rows read 0 where demo reads 5; live Theater plays the deep project's own ledger, which the fake group carries, where demo plays the illustrative slice). The replay clock pins the countdowns and feed
ages to the demo's moment, so the screens are identical to demo mode, and visibly a replay.

## Live, what is still the demo catalogue

Tracks, the loop, the cockpit text (only `feed.lastPollSec` is live), the setup phases: the live source declares these in
`illustrative` (`tracks`, `loop`, `cockpit`, `setup`), and the Door and Fleet mark what they show of them "demo" (the demo source declares nothing: all of it is the
demo). It also declares what the Ladder still shows of the demo: `policy-history` (its opening ledger, the tier-state.yml
head, the policy's revision and merge age, and the commit ids they name: the poller reads belay-policy's files, never its
history). The Ladder marks it with the kit's `Chip` ("demo"), and marks the proof class it reads from `tracks` the same
way. The class records are not declared: the poll counts and stores the record of every class one agent holds
(`../poller/README.md`, "Record counters"), and the Ladder marks a record it did not count (a class several agents or
none hold keeps the record the index held: on the demo GitLab, the seed's) "not counted" itself; a class with no record says "No record yet". The tier meanings are the product's tier vocabulary, the same in every mode, and are not marked. The stage list is
the schema's (`@/schemas/stages`). The Task docket's per-task fixtures are the screen's own render detail for a live task that has one; a fixture with no
source task is not drawn in live mode, and a live task with no fixture is drawn from its own fields. Needs you never draws its desk in live mode (it is built around the demo's
five seeded items): it lists the group's own open items, minus any the demo seeded, or `NeedsYouEmpty`.

Setup in live mode reads every state it shows (`setup/`): a track's arm state is the read of the target's main, never
`setup.arm` or `tracks[].armed`; the doctor's rows are the probe's; a step is done, failed or unknown as a read saw it, never
the catalogue's done, human or todo. What it still draws from the catalogue (the steps' titles and phases, the tracks' names
and arm order) it marks "demo" where it shows it. `parity.test.ts` lists Setup where live differs (`setupLive.test.ts`
holds the reads).

Theater reads only `getLedger()` (and, for a real film's subtitle, the portfolio's group and `deepProjectId()`). When the
ledger names an MR it plays it; otherwise it plays the illustrative film, whose every part comes from the catalogue
(`DEMO`) directly, in every mode, never from the source (`app/features/theater/README.md`).

`getPolicy()`: demo, this checkout's `policy/trust-policy.yml` (`policy.ts`, checked by the engine's parser); live, the
trust-policy.yml the last poll read from belay-policy (`CycleResult.policy`, kept on the snapshot; a cycle that could
not read one keeps the last good one). Null until one was read: the Ladder then draws no counts and says why.
`getTiersStale()`: live, set while the last poll could not read belay-policy (its `policy:<group>` poll_state source
failed, with the reason and the last good read's time), so the class tiers are stale and the Ladder marks them so; null
once a read succeeds, and always null in demo mode. The footer chip "illustrative demo
data" is a client component and still says so.

The recent events are the index's own (`getEvents` in `../index/views/events.ts`): a task's MR opened and merged, the last
poll, and each task's standing (state, proof verdict) on its newest row. They are not the demo's feed, so the Fleet reads
them through `loadFleetSource`, beside `loadFleetData`, and `parity.test.ts` lists them where live differs from demo.
