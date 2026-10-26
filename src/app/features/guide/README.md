# Guide: the night shift, played over the real app

The onboarding. One change on the demo project `ledgerline` is told in 13 steps and three acts: **a change travels**
(finding, red test, patch, Proof Block, guardrail, tier gate, deploy, summary), **it goes wrong** (the poisoned `!44`
blocked, the tripwire quarantines `patch-bump`), **your turn** (the decision on Needs you, the re-admission and its
Outbox write, the recap). It introduces one idea per step, at the moment it happens, on the screen where the person will
meet it again: never a column legend, never a count for its own sake.

A port of the `afterlife-onboarding-v2` contest winner (sonnet variant 1, "The Night Shift"). The winner replayed a
rebuilt copy of the app. The owner's verdict moved it onto the app itself: "the onboard should be layer on top of it, not
as separate experience outside".

- **A layer, not a page.** It is drawn inside AppFrame's window box (the (app) layout's overlay), over the screen in front.
  Each step navigates the real router (as a sidebar click does) to its screen, then lights a real element found in the
  live DOM: the receipt chain's links on Task `!41`, the Court, the Ladder rows, the `!44` exhibits, the Needs you row,
  the re-admission's buttons. A step navigates only when it is entered, so a person who clicks elsewhere is not pulled back.
- **The app does the replay.** On the Proof Block step it opens the Court and presses Task's own Replay, so the checks
  land one by one from the ledger. The tripwire's pink sweep and the ghost cursor are the layer's only drawn effects.
- **The person acts.** On "Your Run" the guide holds: the person reads the incident note and re-admits for real, and the
  write is staged in the Outbox (on the demo, Run only simulates it).
- **Opening.** Once, on the first visit to the demo (a per-browser flag); then G, the sidebar's First run section (it reads
  Help once the guide has reached its recap), the status bar's ? popover, and the palette's "Watch the guide"
  (`?guide=1`). It plays only on the demo estate it replays. Opening it turns the X-ray off.
- **Keys.** Left / Right step, Home / End, Space plays or pauses (on a focused control it presses that control), Esc leaves.
  While the guide is on, its keys are heard before the screen's own (`useHotkeys(..., capture)`).
- **Pace.** Autoplay holds each step 7 s and stops on any manual move and on the steps that wait for the person. A
  hidden tab pauses. Reduced motion: nothing plays by itself, and the ring and the sweeps cut instead of moving.

## Code map

| Path | Role |
|---|---|
| `GuideOverlay.tsx` | The layer as the (app) layout mounts it: controller, ring layer or recap, dock |
| `GuideSidebar.tsx` | The sidebar's First run / Help section: the guide, the X-ray, the first project |
| `model/steps.ts` | The story: each step's screen, target, effects, caption and act |
| `model/playback.ts` | The pure transition table (next, prev, go, toggle, tick) |
| `model/store.ts`, `model/keys.ts` | The external store and its two localStorage keys |
| `model/recap.ts`, `model/find.ts`, `model/keymap.ts` | The recap's ideas, the DOM look-up, the declared keys |
| `hooks/useStage.ts` | Navigate on entry, run the step's effects once, measure the target |
| `hooks/useGuideKeys.ts`, `hooks/useDemo.ts` | The keys; whether the guide can play (hydration-safe) |
| `components/` | Controller (first visit, events, autoplay), Dock, Rail, GuideLayer, Recap and their CSS |

The look is the winner's, measured: `style-contract.py` reads 0 deviations on the dock, the rail, the ring and the recap.
Three properties were accepted because of the verdict itself: the caption's width and the ring's width (the dock sits
inside the window, and the ring lights real elements). Text is sized off `--t-body`, so at Standard it is the winner's
pixels (caption 21, chip 16, rail 15, recap headline 26) and it follows the person's text size.

A step's target is a selector into another feature's markup (`ol[aria-label="Receipt chain"]`, `#row-patch-bump`,
`section[aria-label="Claims tested by checks"]`). When one of those screens changes its markup, the step loses its ring,
not its caption; `model/playback.test.ts` keeps every step pointing at a screen and a target.
