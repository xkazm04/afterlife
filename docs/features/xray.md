# X-ray (`src/app/features/xray`)

> What is this screen for, what do its columns mean, and what do I do here?

## What it does
- An annotation layer over the real windowed screens: a blueprint wash, with the active part cut out, outlined and numbered,
  a card that says what the part is, and a docked panel that lists the parts. Parts are found live in the DOM by selector,
  never drawn from a copy, so a label always sits on the control it names. The layer takes no click from the app.
- It introduces a module, it does not tour its switches: the screen's question, what every column means, the few key
  activities, and the shell around it. Tabs, view switchers, filters and search boxes are not introduced; the user sees
  what they are looking at.
- Covers every windowed module, in sidebar order (`APP_NAV`): Fleet, Monitor, Needs you, Ladder, Maturity, Cycles, Task,
  Onboard, Setup, Trace, Theater, Runs. The panel's "Next screen" button drives the real router.

## When it opens
- First visit to the demo (a per-browser flag, `takeFirstVisit`), on Fleet.
- `?xray=1` on any screen: the palette's "Show X-ray" (to Fleet), and the sidebar's First run links, one per screen.
- X (not while typing), the sidebar's "X-ray this screen", or the help popover's "?" (the `afterlife:xray` window event).
- Live mode with nothing to show (before the first poll, or an empty group): the (app) layout's gate covers the column
  with Trace; the sidebar's "Set up my first project" and the end of the tour lead there too.
- Escape closes it (as the top overlay layer). Screens seen are kept per browser (Settings lists the two browser keys it keeps).

## The content contract
Each screen is one `readonly Callout[]` in `callouts/screens/<group>/<screen>.ts`, exported by wire name (`FLEET`,
`NEEDS_YOU`, ...) and mapped to its `APP_NAV` key in `callouts/tour.ts`. A callout is `{ id, kind, sel, title, body(read),
try?, legend? }`; `body` reads the drawn screen, so the words carry its real numbers.

| kind | Panel heading | Count | What it is |
|---|---|---|---|
| `module` | This screen | exactly 1, first | `sel` is the screen's `main`; the body states the question and purpose |
| `columns` | Columns | 0 to n, usually 1 | One part on the header row; its `legend` lists every column, named as the header renders it |
| `activity` | What to do | 1 to n | A real element and the key thing to do with it |
| `shell` | Around it | 0 to n | The sidebar, status line, data label and help (`callouts/shared.ts`) |

Order is module, columns, activity, shell. `callouts/contract.test.ts` holds every tour stop to it, and keeps tabs,
radiogroups and search boxes out of the selectors. Only the active part outlines and cuts out; the others keep a number
chip. A part whose selector is not drawn (a hidden `<Activity>` copy does not count) shows "not on screen now" in the panel.

## How to add a screen
1. Add `callouts/screens/<group>/<screen>.ts` exporting `readonly Callout[]`: a `module` callout on `main`, then columns,
   activities, and `statusCallout`, `dataLabelCallout`, `helpCallout` from `shared.ts`. Keep a folder at 10 files or fewer.
2. Map it to its `APP_NAV` key in `callouts/tour.ts`; the stop's label and href come from the nav, never copied.
3. Read the drawn screen first and check every selector resolves in demo and in `BELAY_MODE=live BELAY_GITLAB=fake`.

## Code map
| Path (under src/app/features/xray/) | Role |
|---|---|
| `XrayOverlay.tsx`, `XraySidebar.tsx` | Mounted by the (app) layout: the layer, and the First run section |
| `components/` | `XrayLayer` (wash, outline, chips, card with its legend), `XrayPanel`, `XrayController`, `useParts` |
| `model/` | `types` (`Callout`), `dom` (`pick`, `screenRead`), `place` (card placement), `store`, `keys` |
| `callouts/` | `tour.ts`, `shared.ts`, `contract.test.ts`, `screens/{watch,decide,trust}/` |
