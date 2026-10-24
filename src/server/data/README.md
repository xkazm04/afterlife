# src/server/data - the DataSource (module B6)

Every screen's server loader reads through one interface, `DataSource` (`types.ts`). It has the surface `@/lib/demo` always
had (`getFleet`, `getPortfolio`, `getStages`, `getTiers`, `getTracks`, `getActionClasses`, `getMaturity`, `getLoop`, `getTasks`,
`getNeedsYou`, `getNeedsYouCount`, `getSetup`, `getEvents`, `getCockpit`), `getDecided()` (live: the deep project's
proposals acted on in the 7 days before the snapshot, newest first, the seed's own left out; demo `[]`, the desk keeps its
own week), `getCycles()` and `getEstateCycles()` (the deep
project's closed cycles, and every project's: `src/lib/demo/cycles.ts` and `estate.ts` in demo, `cycle_record` in live),
`getStability()` (each project's agent-MR stability over 7 days, `src/lib/stability`: live from `index/views/stability`,
every polled project; demo the deep project only, counted from the demo's tasks that name an MR, sizes and pipelines null
because the fixture states none; the screens take it beside the fleet, never in `FleetProject`), `getFleetTrend()` (the
fleet's last 28 UTC days, one `FleetDayRow` per project a day, `src/lib/trend`: live from the index's append-only
`fleet_day`, which `live/day.ts` writes once a UTC day after the runtime's snapshot, from the numbers that snapshot serves the
Fleet; demo 28 days seeded from the demo fleet, `src/lib/trend/seed.ts`, which every screen labels seeded) plus
`mode`, `deepProjectId()` and `illustrative` (the demo narrative it serves beside live data, for the screens to label) and
`getPolicy()` (trust-policy.yml's rules: the promotion thresholds, the demotion triggers, the envelope) and `getLedger()` (the
deep project's hash-chained `LedgerEvent`s, `@/schemas/ledger`, in seq order; see "The ledger" below). Reads are
**synchronous**: the live source serves a snapshot that is rebuilt after every poll, so a page never waits on GitLab or the index.
One exception, Setup: `setupReads()` is a synchronous getter (null in demo mode) for read-only port calls the Setup loader
awaits per load (see `setup/` below). And the human key: `humanKey()` reads belay-policy's protection of its default branch and
its approval settings through the port when the Ladder's class page loads (`setup/humanKey.ts`; no cache, nothing in the index);
demo answers verified, marked `demo`.

| Env | Values | Default |
|---|---|---|
| `BELAY_MODE` | `demo`: the fixture. `live`: the index. Anything else (the hosted replay's `replay` too) is demo | `demo` |
| `BELAY_GITLAB` | `glab`: the operator's own login. `fake`: the seeded fake group `acme-lab` (live mode with no real group) | `glab` |
| `BELAY_PROJECT` | the project the deep screens are about | `ledgerline` |
| `BELAY_POLL_SECONDS`, `BELAY_GROUP_ID`, `BELAY_DATA_DIR` | see `../poller`, `../gitlab`, `../index` | 30, 144060371, `.belay/` |

`getDataSource()` is chosen per call from the environment of the running server, so the build's environment never matters.
Every caller reads it after `await connection()` for that reason: the build prerenders only the static shell, never a
read (`docs/features/server.md`, Rendering).

## Files

| File | What it is |
|---|---|
| `index.ts` | the barrel the screens' loaders import (`getDataSource`, `setDataSource`, `demoSource`, `liveSource`, the runtime, `bootLive`) |
| `config.ts` | `readDataConfig(env)`: the three env vars above, read per call |
| `select.ts` | `getDataSource()`, and `setDataSource()` for tests |
| `demoSource.ts` | the demo accessors, unchanged |
| `live/liveSource.ts` | the snapshot + the demo catalogue; throws before the first poll has finished (an empty fleet must not pass for real) |
| `live/snapshot.ts` | `buildSnapshot(db, at, deep, catalogue, policy, group)`: views from `../index` for fleet, action classes, maturity, tasks, recent events, needs-you, decided, every project's cycles, stability and the trend's 28 days, plus feed age, the group name, the pairing row, the poll's health (`pollHealthOf`: the watched group's row and the linked projects'), the tiers' staleness (belay-policy's poll row) and the deep project's ledger (`readLedger` by its row's gitlab id) |
| `live/seeded.ts` | `SEEDED_ITEMS` and `isSeeded(id)`: the ids the demo seeds into an index, which a real group's index never holds. `getNeedsYouCount()` and the deep project's fleet row exclude them, as `/needs-you` does (`getNeedsYou()` still returns them) |
| `live/narrow.ts` | where the screens' types have no "unknown": quarantined for an unknown tier, `T?` for an unknown track, 9 null rungs for a scan that never ran, an unclassified task is not listed |
| `live/runtime.ts`, `boot.ts` | one port + index + poller + snapshot per process, kept on `globalThis`; started by `src/instrumentation.ts` (`register`); a failed start (a first poll cycle that throws included) is kept, named on the pages, and retried no more often than the poll interval; the start that succeeds, first or retried, says one `belay: live data from` line (`liveLine`) |
| `live/cycleLog.ts` | `cycleProblems` and `cycleLine`: what a cycle reported without throwing (the group read's error, the warnings, a trust-policy.yml the screens cannot show, each project's error and issues), logged by the runtime as one `belay: poll cycle` line only when it differs from the last cycle's (what is new, what cleared) |
| `setup/` | Setup's live reads (`read.ts`): each track's arm block on the target's main (`checkArm`; a track with no arm content is "not defined yet", a refused or failed read is unknown with its reason), the belay doctor (`probeCapabilities` on the configured group, stamped with the real time), and the steps a read observes (`OBSERVED_STEPS`): 0 (`glab api user`), 1 (the snapshot's pairing row), 3 (the group's plan, `humanSteps.ts`), 4 (the target and belay-pack, belay-policy, belay-ledger, belay-engine and belay-apply in the group), 6 (a gitlab--duo runner online), 8 (the settings of belay-apply that hold no secret; it never reads done), 9 (every protection it lists, read back: `protections.ts`) and 10 (the bootstrap MR). Every other step is unknown, "not probed". `ctx.ts` is what one load's step reads share (the port, the group, the one project listing). `humanKey.ts` reads the human key on belay-policy. `rereadAction.ts` (`'use server'`, localhost only, read only) is Re-probe and a step's verify. `types.ts` is what the screen receives |
| `live/clock.ts`, `ports.ts` | system clock vs the fake group's **replay clock** (polled 14:21:48, read 14:22:00, always) |
| `shell/read.ts` | `readShellInfo(ds, env)`: the shell's numbers (the Needs-you badge, the status bar's mode, fake flag, group, illustrative and poll health). The palette's projects are not in it: `GET /api/shell/projects` serves them on the palette's first open. The root layout streams it (ShellRead, behind `connection()`) and `GET /api/shell` (`src/app/api/shell/route.ts`, no-store; 503 with the reason before the first live poll, never a demo payload) answers it, so the client re-reads it on window focus and on refresh() (`components/shell/live/`): a layout does not re-render on navigation |

## The ledger

`getLedger()` returns the deep project's events (`belay-ledger/events/<gitlab-id>.jsonl`) as the index holds them, in seq
order. Live, `buildSnapshot` reads them once per poll with `readLedger(db, gitlabId)`, the gitlab id from the deep project's
row; a project with no gitlab id, or with no ledger, reads `[]`. Demo: `[]`: the demo dataset has no ledger, and the
hosted replay reaches no index. `getLedgerCheck()` is that chain verified from genesis (`{ hash: 'sha256', brokenAt }`, the
first broken seq or null): live, `buildSnapshot` runs `verifyChain` once per poll (the index holds only a chain that verified
on import, `../ledger/importLedger.ts`, but one edited in the index since must still read broken); demo, once. The Task
docket reads it, so no page request re-hashes the chain. Tested in `__tests__/ledger.test.ts` on the fake group
(`__tests__/fakeGroup.ts`, the rig `parity.test.ts` shares): ledgerline's 7 events, which `verifyChain` accepts, and the
same chain edited in the index, which reads broken.

## The fake group and parity

`BELAY_GITLAB=fake` starts an in-memory index, seeds it with `seedDemo` (what GitLab cannot express: the other 183 projects,
scan, records, narrative), and polls `gitlab/fake/demo/` (a GitLab built from the demo dataset: ledgerline's MRs, notes,
labels, deployments, policy files and a verifying ledger). The poller's rows then overwrite the seed where they derive the
same values, which `__tests__/parity.test.ts` proves for every loader (`loadFleetData`, `pickNeedsYouDemo`, `loadLadderData`, `loadMaturityData`, and `loadSetupData`'s catalogue parts; `loadTasks`, the Needs-you count and `loadTheaterData` are listed where live differs from demo: live draws only the source's tasks, and counts only unseeded Needs-you items, so the layout badge and the deep project's Fleet and Door rows read 0 where demo reads 5; live Theater plays the deep project's own ledger, which the fake group carries, where demo plays the illustrative slice). The replay clock pins the countdowns and feed
ages to the demo's moment, so the screens are identical to demo mode, and visibly a replay.

## Live, what is still the demo catalogue

Tracks, the loop, the cockpit text (only `feed.lastPollSec` is live, null until the deep project has a feed), the setup phases: the live source declares these in
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
`getTiersStale()`: live, set while the last poll could not read belay-policy (the watched group's `policy:<group>` poll_state source
failed, with the reason and the last good read's time), so the class tiers are stale and the Ladder marks them so; null
once a read succeeds, and always null in demo mode. The footer chip "illustrative demo
data" is a client component and still says so.

The recent events are the index's own (`getEvents` in `../index/views/events.ts`): a task's MR opened and merged, the last
poll, and each task's standing (state, proof verdict) on its newest row. They are not the demo's feed, so the Fleet reads
them through `loadFleetSource`, beside `loadFleetData`, and `parity.test.ts` lists them where live differs from demo.

`getPollHealth()`: live, the poll's health on the snapshot (`pollHealthOf` in `live/snapshot.ts`): the age of the last
cycle that read the group (the watched group's `group:<g>` poll_state, by the source's read clock; a group polled before is not read), that cycle's error if the last one failed,
and how many of the polled (GitLab-linked) projects' last polls failed; null in demo mode. `shell/read.ts` adds the poll
interval, and the status bar says it on every screen (`components/shell/bars/poll/`), with a Re-poll of the whole group
on a failure (`repollGroupAction`, the same 10 s gap as a project re-poll).
