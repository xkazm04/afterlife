# Guide: the path through the app, played over the real screens

The onboarding. It walks the app in the order a person meets it, in four chapters that are the sidebar's own groups
(`NAV_GROUPS` in `components/shell/sidebar/navItems.ts`), so the tour also teaches where things live:

1. **Start**: Set up one project (`/start`), bring the rest of the group in a batch at a time (`/onboard/estate`), arm
   the eight agents (`/setup`).
2. **Watch**: Fleet, Monitor, Vitals, Theater: the estate as a table, as live leads, in production, in replay.
3. **Govern**: one agent action on the demo project `ledgerline` (Task `!41`'s receipt chain, then its Proof Block),
   why it could merge alone (earned autonomy on the Ladder), what goes wrong (the guardrail blocks `!44`, the tripwire
   quarantines `patch-bump`), and what only a person decides (Needs you, then the re-admission's Outbox write).
4. **Improve**: Maturity, Cycles, Runs.

Each step introduces one module or idea, on its screen; numbers appear only as part of a situation. 18 steps, about two
minutes. A port of the `afterlife-onboarding-v2` contest winner (sonnet variant 1, "The Night Shift"): its dock, rail,
ring and recap, moved onto the app itself at the owner's verdict ("layer on top of it, not as separate experience
outside"), then re-pathed into chapters when the owner asked for a chronology rather than module depths.

- **A layer, not a page.** It is drawn inside AppFrame's window box (the (app) layout's overlay), over the screen in front.
  Each step navigates the real router (as a sidebar click does) to its screen, then lights a real element found in the
  live DOM. A step navigates only when it is entered, so a person who clicks elsewhere is not pulled back.
- **The app does the replay.** On the Proof Block step it opens the Court and presses Task's own Replay, so the checks
  land one by one from the ledger. The tripwire's pink sweep and the ghost cursor are the layer's only drawn effects.
- **The person acts.** On "Your write" the guide holds: the person reads the incident note and re-admits for real, and
  the write is staged in the Outbox (on the demo, Run only simulates it).
- **It never starts by itself.** On the demo, until it was watched or skipped, an invitation sits top centre of the
  window under the toolbar (`components/invite/`), naming the four chapters, with Start and Skip. Skip is remembered per
  browser. The guide also opens from Shift+G (heard before the screen, so a focused table's type-ahead cannot take
  it), the sidebar's First run section (Help once it has been watched), the status bar's ? popover and the palette's
  "Watch the guide" (`?guide=1`). It plays only on the demo estate it replays, and opening it turns the X-ray off.
- **Keys while it plays.** Left / Right step, Home / End, Space plays or pauses (on a focused control it presses that
  control), Esc leaves; they are heard before the screen's own (`useHotkeys(..., capture)`). The chapter labels under
  the rail jump to a chapter's first step.
- **Pace.** Autoplay holds each step 7 s and stops on any manual move and on the steps that wait for the person. A
  hidden tab pauses. Reduced motion: nothing plays by itself, and the ring and the sweeps cut instead of moving.

## Code map

| Path | Role |
|---|---|
| `GuideOverlay.tsx` | The layer as the (app) layout mounts it: controller, ring layer or recap, dock; the invitation when off |
| `GuideSidebar.tsx` | The sidebar's First run / Help section: the guide, the X-ray, the first project |
| `model/steps.ts`, `model/story/` | The path: types and chapters, then one file of steps per chapter |
| `model/playback.ts` | The pure transition table (next, prev, go, toggle, tick) |
| `model/store.ts`, `model/keys.ts` | The external store and its two localStorage keys |
| `model/recap.ts`, `model/find.ts`, `model/keymap.ts` | The recap's ideas, the DOM look-up, the declared keys |
| `hooks/useStage.ts` | Navigate on entry, run the step's effects once, measure the target |
| `hooks/useGuideKeys.ts`, `hooks/useDemo.ts` | The keys; whether the guide can play (hydration-safe) |
| `components/` | Controller (keys, events, autoplay), Dock, Rail, GuideLayer, Recap, `invite/` and their CSS |

The look is the winner's, measured: `style-contract.py` reads 0 deviations on the dock, the rail, the ring and the recap.
Three properties were accepted because of the verdict itself: the caption's width and the ring's width (the dock sits
inside the window, and the ring lights real elements). Text is sized off `--t-body`, so at Standard it is the winner's
pixels (caption 21, chip 16, rail 15, recap headline 26) and it follows the person's text size.

A step's target is a selector into another feature's markup (`ol[aria-label="Receipt chain"]`, `#row-patch-bump`,
`section[aria-label="Claims tested by checks"]`). When one of those screens changes its markup, the step loses its ring,
not its caption; `model/playback.test.ts` keeps every step pointing at a screen and a target.
