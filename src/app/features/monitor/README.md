# Monitor

Route `/monitor`, the in-app port of the front-door contest's runner-up, "Vital Signs" (contest
`afterlife-front-door`, A/3). It is a quick monitor of what waits for a person: the whole fleet as
seven phosphor leads, one per group, with every project a beat. Pick a beat, then act on it in the
inspector. `page.tsx` loads the data on the server (`data/loadMonitorData.ts`, through the
DataSource, so it works in demo and live mode) and renders the client `MonitorScreen`.

## The beat grammar (`model/beat.ts`)

- **Watching** draws a beat. The R wave grows with the armed tracks.
- **Setting up** draws a low, dashed beat.
- **Quarantined** adds a rose Q dip to the beat.
- **Stale** draws a flat line over hatching, with a faint ghost of the last beat.
- **Not watched** draws a dashed break with end ticks. It is unknown, never zero.
- **Decisions** are amber pips standing on the R peak. At most six are drawn; the count says the
  rest.

## Parts

- `MonitorScreen.tsx` composes the Window: the sidebar marks and leads, the toolbar's Sweep toggle,
  the answer band and leads in the pane, the inspector, the status bar and the "?" legend.
- `components/answer/` holds the amber headline and the HUD readout. The readout names whatever
  the pointer or the keyboard is on.
- `components/leads/`:
  - `Leads` holds the rows and the arrow keys;
  - `LeadStrip` draws one lead as SVG;
  - `LeadCells` is the open lead, with a name under each beat.
- `components/inspector/`:
  - the overview, shown when nothing is picked;
  - the picked project's vitals, signal (stages, tiers) and exits;
  - `Decisions`, the items to act on.
- `components/MonitorSidebar`, `MarkGlyph`, `MonitorStatus`, `MonitorLegend`.
- `hooks/useMonitor` holds the screen state: resolve, re-poll, selection, the open lead, the lit
  mark and the hover. `hooks/useSize` measures a strip.
- `model/` holds the counts, marks, readout words and beat geometry. It is pure and tested
  (`model.test.ts`).

## Rendering budget

The owner chose the illustrated front door on the condition that it gets "a heavy pass of UI
optimizations as the variant is resource heavy to render all". This screen was built to that rule
from the start:

- Each lead is about ten SVG paths, rebuilt only when its width changes. Beats are never one node
  each, and hovering never re-renders a strip.
- Glow filters sit on those few static paths only.
- The sweep is one CSS-transformed layer per lead. It is off under `prefers-reduced-motion`, and
  the toolbar can pause it.
- The poll counter ticks inside `MonitorStatus`, so the leads never re-render for it.

## Behaviour to know

- Resolving a decision (only ledgerline has real ones), re-polling and the sweep change only this
  screen's state. Nothing is written.
- Arrow keys move the selection beat to beat and lead to lead. Enter opens the lead into named
  cells; the other leads shrink to thin traces.
- The colours are tokens only, so the screen follows the active theme. It is drawn for Ghostwire
  (`styles/brand/afterlife-b.css`).
