# Setup (`/setup`, F6)

The unlock map, ported from the approved "Unlock map" prototype. Steps 0-14 by phase, the eight
tracks in arm order and the belay doctor capabilities, joined by drawn edges. Probes move steps, MRs arm
tracks, and Belay writes only on a click, after showing the exact command. Arm and disarm go through the server's
plan and preview door (`src/server/actions`). Demo mode simulates the steps and the doctor; live mode reads them.

- `SetupScreen.tsx` composes `Window` (toolbar, summary strip, map, status bar, legend); a node click opens
  `/setup/[node]` (`SetupNodeScreen`, a `DetailPage`; keys `step-<n>`, `track-<id>`, `cap-<slug>`, `loadSetupNode` 404s
  the rest). `app/setup/layout.tsx` awaits
  `loadSetupData` and holds the flow in `SetupProvider`, so it survives map to node and back: the data source's setup, tracks and classes, and in live mode `live`, what the server read now
  (`src/server/data/setup`): each track's arm block on the target's main (`checkArm`), the belay doctor
  (`probeCapabilities` on the paired group, with each row's reason and the real probe time), and the steps a read can
  observe (`OBSERVED_STEPS`): 0 (glab's login), 1 (the pairing row), 4 (the target and the five belay projects, one
  listing the other reads share), and the human steps 3 (the group's plan and trial), 6 (a `gitlab--duo` runner online
  for the target), 8 (belay-apply's minimum role for pipeline variables and its schedule on main; never a CI/CD variable,
  so it never reads done) and 10 (the `belay/bootstrap` MR merged and `.gitlab/duo/agent-config.yml` on the default
  branch), in `humanSteps.ts`; and step 9 read back (`protections.ts`: the target's main and `belay/*`, its CODEOWNERS,
  author-cannot-approve, belay-apply's main, the two job token allowlists, the `v*` tags, belay-ledger's main; 10 settings,
  and force push off is read on every branch that step 9 sets it on), done only when every setting reads back as listed. Step 7 is not read (`StepDetail.unread` says why). One live load makes 28 to 34
  GitLab calls (16 before these reads). Step 9's commands read first, then DELETE and POST each protection: GitLab
  protects a pushed main already and a second POST answers 409. `illustrative` says what is still the catalogue's.
- `components/map/` canvas, edge layer (SVG, measured from `[data-node]`), `columns/`, `nodes/`.
- `components/inspector/` step / track / capability panels as page sections (`NodeBody`, `nodeHead` for the title and one-line lede); `parts/` dep lists, probe line. A track's "Standing" section lists each of its classes where it stands now (the action classes the Ladder reads, through the data source) with the gate last seen deciding for it (`GateSeenLine`; demo: the fixture's, chipped "demo"), and says arming does not grant a tier and does not write tier-state.yml. A class with no record yet also shows what the enrollment MR would write (`model/enroll`: `min(start_tier, ceiling)`, start_tier from the policy the data source read), worded as what the MR would write, never as a tier held. `EnrollSection` follows the arm: once the track reads armed and none of its classes holds a record, it asks the server for the `enroll-track` preview (`write/enroll.ts`, `hooks/useEnrollWrite`), shows the tier-state.yml diff and commands, confirms by preview id and names the MR from GitLab's answer (demo: simulated, and said so); otherwise it says why (not armed yet, already enrolled, or no agent class). Whether Belay has the track's arm content is the arm section's own fact; nothing is called "not enforced" from it.
- `components/summary/` the strip above the map: counts and the gates only you can open.
- `components/toolbar/` group menu, doctor lozenge (lights capabilities), Re-probe.
- `components/shared/` DepRow, GateRow, Spinner, CapGlyph. `SetupStatus` (progress, probe age), `SetupLegend`.
- `hooks/` `useSetupFlow` (reducer + async probes + toasts), `useArmWrite` (the planned arm/disarm MRs on screen), `useSetupView` (pick, hover, filter, Esc), `SetupContext`.
- `write/arm.ts` the round trip: `previewAction` when a track's Arm or Disarm section is in view (`parts/ArmPreview` shows the
  summary, the branch the plan creates, the commands, the `.gitlab-ci.yml` diff and the track's notes (for T4, its five: the writes are belay-apply's, BELAY_BOT_TOKEN lives there and never on the target; T3, T6 and T1 say the same of theirs, and name what the person adds by hand);
  `confirmAction` with that preview's id on the click. The MR number and its address come from the confirm's answer, never
  from the demo. A track the repo does not define yet shows the server's refusal.
- "I merged it · verify" calls `verifyArmAction`: a read of the target's default branch. A track arms (or disarms) only when
  the read saw its block there (or saw it gone); otherwise the MR stays open with what was found (`model/flow/verify.ts`).
  Demo mode reads nothing and the track says simulated.
- Live (`model/live/`, `hooks/liveFlow.ts`, `read/reread.ts`): the opening state is the read. T4 with no block on main
  opens ready (Arm) once step 4 reads done (its MR includes a belay-pack component, so T4 needs the projects step 4 creates; T1 and T8 inherit it through T4), else locked · needs step 4. T3 and T6 also need step 4 (their includes are belay-pack components too, `data/armMeta.ts`, decided 2026-10-15), so with no block they open ready once step 4 reads done, else locked; T1 opens locked until T4, T3 and T6 read armed; a track with no arm content is "not defined yet"; a refused or failed read is unknown, with its reason.
  No timer probes: a step's verify ("I did it · verify", "Read again") and Re-probe call `rereadSetupAction` (read only,
  localhost only), and a step no read observes stays unknown, "not probed". A human step not read done is still yours:
  it counts in "need you", the map marks it "you", and it reads unread (or not yet), never done; "Nothing waits for you"
  only when every human step reads done (or said, below) and no arm MR is open (`humanGates`). A human step no read can
  ever see done (7, and 8's four tokens: `unread`) offers "I did it · say so": the step reads "you said done HH:MM · not
  read", stays unknown (dashed, never the done mark), meets no track's need, and stops counting in "need you". It writes
  nothing, to GitLab or anywhere: it lives in the screen's state, so a reload counts the step again. A read that says
  not done wins over it; "Take it back" undoes it. A step's write is never sent from the screen
  (Copy only). The commands name the paired group, its host and `BELAY_PROJECT` (`data/stepDetail.ts`, `stepDetailsFor`);
  demo keeps its own. The group menu offers the paired group only; no demo row or `acme-sandbox`. The step titles and
  phases and the tracks' names and arm order are the catalogue's, marked "demo" on their column heads and on the node pages.
  The shared status bar still says "illustrative demo data" in every mode (not Setup's to change).
- `model/map/` graph closure (needs, frees), hot sets, edge paths. `model/flow/` state, reducer, probe age, wording. All pure, tested.
- `data/` the prototype constants as typed fixtures (step detail, arm needs, capability reliance, timing).

State: step `todo|human|probing|done` in demo (done only on a probe; step 6 fails its first probe), `done|failed|unknown`
in live (what a read saw); track `locked|ready|open|probing|armed` (arm opens an MR as you, a person merges, Belay
verifies; disarm is a revert MR), plus `undefined` (no arm content in the repo) and `unknown` (the read failed) in live.
A doctor probe is stale after 2 min (amber, with its age); a failed probe reads "probe failed HH:MM" (amber, with its
age), never as a fresh probe; a never-probed group is all unknown.
Keys: Esc clears, Tab walks the map. Sizes follow `--ui-scale` (D10).

On the shared kit: `Chip` (status/chip), `Stats` (inspector/blocks) and the comment lines under a command (`CommandBlock` notes).
`shared/DepRow` and `shared/GateRow` stay local.
Also generic enough to promote: `map/useEdgeGeometry` (measure nodes for drawn edges), `map/EdgeLayer`.

## Decisions

- Setup arms T4, T3, T6 and T1 (`src/server/actions/arm/content/`: guardrail, governor, maturity, patcher). The other four
  tracks read "not defined yet" until each one is defined. T3 needs `BELAY_PROOF_AUTHORS` (tier-gate's `proof_authors`)
  and refuses without it; T6's block adds `maturity-scan` only, not GitLab's scanner templates (the person includes those).
- Step 8 asks for no model key. Nothing in the repo reads `ANTHROPIC_API_KEY`, no defined track (T4, T3, T6, T1) needs one, and plan row O5
  recommends Vertex AI, which is keyless through step 7. The key returns with T7, and only for the Anthropic-key route
  that step 2 records. Step 8 sets the four `BELAY_*` tokens on belay-apply, one command each: a silent read piped to
  `glab variable set <NAME> -R <group>/belay-apply --masked --protected --hidden`, so no value is in the command or on
  screen. A person runs them one at a time (a second pasted line would be read as the first value), so each has its own Copy.
- Where Setup and `skills/adopt-belay` disagree, Setup's live reads decide and the skill follows. A command Setup shows must
  run, or Setup shows no command: on the target's full path (a subgroup's, from the listing) and, off gitlab.com, on the
  paired host (`--hostname` for `glab api`, a full URL for `glab variable set -R`, `GITLAB_HOST` for the rest; on gitlab.com
  the commands are as they were).
- Step 8's role read stays. `secretsRead` reads `GET projects/:id` for belay-apply (`humanSteps.ts`), and for a Maintainer that record
  can carry `runners_token`. Only `ci_pipeline_variables_minimum_override_role` is kept (the `role` it reads); the rest is not logged,
  stored or returned, and a failed read says only the first line of glab's error, 200 characters at most (`ctx.ts` `why`,
  `gitlab/errors.ts` `failureToError`). The read is the only one that catches a role that lets a pipeline variable override reach belay-apply, which
  holds every write token; the schedule read cannot see that. A field-selected read (GraphQL `ciCdSettings`) would remove the
  exposure: proposed, not built, its field not verified. The full council's second round (2026-10-08) judged the read worth keeping.
- "You said done" (steps 7 and 8's tokens) is kept only in the screen's state, not persisted. Losing it on a reload fails safe: the
  step asks again instead of claiming done. Persisting it needs a store (browser storage or the index), and none is chosen.
- Step 7 is not read: the API docs give the GET two paths, and a saved integration is not a working token exchange
  (`data/stepDetail.ts`, step 7's `unread`).
- Step 9 runs DELETE then POST back to back, not PATCH, because a PATCH needs the ids of the access levels it replaces. The step states
  the gap between the two commands. If a POST is refused after its DELETE, the read-back reads "not protected" (`protections.ts`, `guardedAgainstDevelopers` and belay-apply's main).
- A load's paged lists (the group's projects and belay-apply's schedules) each stop at 50 pages (`maxPages`, `src/server/gitlab/adapter/client.ts`),
  so the 28 to 34 GETs above grow by one call per extra page, up to that cap.
- [R?] Off gitlab.com, two host forms rest on glab's documentation, not on a run against a self-managed host: the
  `GITLAB_HOST=<host>` prefix for commands that take neither `--hostname` nor `-R` (`data/stepDetail.ts` `onHost`, and
  the comment above `own`), and the full-URL form of `glab variable set -R` (`repoOf`, used by step 8's `cmd`). On gitlab.com
  neither form appears.
- The target's path is read once, when the screen loads (`src/server/data/setup/read.ts`, `targetPath`), and is copied
  into the state only there (`model/flow/state.ts` `liveSetupState`, `projectPath`). `rereadSetupAction` answers `steps` or `doctor`
  (`src/server/data/setup/rereadAction.ts`), and the `steps-read` that follows a step's "Read again" or a Re-probe
  (`hooks/liveFlow.ts` `probe`) does not set `projectPath`. A project renamed or moved after the load keeps its old path in the
  commands until the page reloads.
- T4, T3 and T6 need step 4 (`data/armMeta.ts`, `ARM_META.T4.needs` is `['step:4']`, T3 and T6 since 2026-10-15), because each arm MR includes a belay-pack component,
  and that component needs the projects step 4 creates. When live mode cannot read step 4 (a refused or failed read is
  unknown), T4 stays locked, as T5 does for step 6 (`ARM_META.T5`; `model/live/live.test.ts`, "with step 4 failed T4 is
  locked and reads "needs" with step 4's label"). This fails closed: Setup does not offer an arm MR for a project that may
  not exist. The App Master made this call on 2026-10-08.
- A merged disarm returns a track to ready, then `recomputeLocks` locks it again if a need no longer reads met
  (`model/flow/reducer.ts` `verifyEnd`). The demo opens with step 4 done, so a disarmed T4 is ready there; with step 4
  taken back (a live read that sees it undone) it locks. `model/flow/verify.test.ts` asserts both halves.

Known disagreements (the skill is `skills/adopt-belay/SKILL.md`, by step row; Setup is `data/stepDetail.ts` by step key and
the reads in `src/server/data/setup/`; named, not line-numbered, so they do not drift):

| | Step | Skill | Setup |
|---|---|---|---|
| a | all | "done when `belay doctor` says so" | doctor probes capabilities only; Setup reads steps 0, 1, 3, 4, 6, 8 (never done), 9 and 10 itself (`read.ts` `OBSERVED_STEPS`, `humanSteps.ts`, `protections.ts`); 7 is said, not read; 2, 5 and 11-14 are not read yet |
| b | 1 | no pairing; names `BELAY_PACK_VERSION`, `BELAY_ENGINE_REF` and `BELAY_ENGINE_COMMIT` | pairs the checkout (`1.does`); names the same three in `1.note`, as the example's values (1.0.0, v0.1.0), never defaults |
| c | 5 | pushes the demo bank and pairs the checkout | agrees: shows only `git push --mirror` and says the pairing in prose, though `belay pair <checkout>` (`cli/belay.mjs`, `src/server/pair/`) prints the bootstrap and adds it with `--write` |
| d | 0 | checks the GitLab version | does not (`0.cmd`, `read.ts` `loginRead`) |
| e | 2 | asks for a CRA drill mode | does not (`2.does`) |
| f | 9 | agrees: author-cannot-approve, the CODEOWNERS paths, read first then DELETE and POST, done when Setup reads every setting back | same (`9.does`, `9.cmd`, `protections.ts`) |
| g | 10 | Agent, then Human | human (`10.who`); Setup reads it done when the bootstrap MR is merged and the agent config is on main |
| h | 11, 12, 14 | | agrees: 11 shows no command, 12 `glab ci run`, 14 `npx belay doctor` (`cli/belay.mjs` runs `doctor`, `run`, `scan` and `pair`; only `replay` is not implemented yet) |
| i | 4 | creates belay-engine too | agrees: `DEMO_NAMES.projects` and `BELAY_PROJECTS` have belay-engine |
| j | 3 | Ultimate trial and the hackathon group | the trial only (`3.does`); the read sees the group's plan and trial, not a hackathon group |
| k | 11 | Agent, else Human | agent, coming back to you in prose if the API route is not there (`11.does`) |
| l | 8 | the four tokens, the role, the schedule, one command per token | agrees (`8.cmd`); no model key on either side |

Not ported: the hero heading, legend strip and per-node "why" lines (cut in the notes). Capability edges stay
illustrative, and demo only: a live probe row is not tied to tracks. No arrow-key walk (as in the prototype).
