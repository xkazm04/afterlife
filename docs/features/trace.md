# Trace (`/trace`)

> Is this machine, my GitLab login and my group ready, one real probe at a time?

## What it does
- Sets up the first project as one wire of six nodes, left to right: **glab installed** and **Signed in** (this machine and
  GitLab), **Group readable**, **Live, first poll** (Afterlife), **afterlife doctor**, **Unlock map**. Each lights when the app's
  own probe passes; the selected node shows the exact command that clears it, to copy into your terminal.
- **Re-check all** probes again. The probes only read (GETs as your own glab login); Afterlife runs none of the commands and
  writes nothing, and an environment change needs a server restart. The status line says how many nodes pass and when.
- Says which GitLab it reads: a chip for the seeded fake group, the demo server with real probes of this machine's glab,
  or live on the host.
- In live mode before the first poll, or with an empty group, the (app) layout shows Trace over the screen's column instead
  of the error page (`facts.gate` `not-ready` or `empty`); Re-check brings the app back once the wire reaches the group.
  `?rehearse=not-ready` shows that state on purpose, chipped "rehearsal".

## How it works
- `src/app/(app)/trace/page.tsx` renders `TraceScreen` with `loadTraceFacts`; `LiveGate` renders it in the layout when the gate is set.
- `data/facts.ts` reads what the server knows without probing (mode, fake, group id, host, live runtime, project count);
  `data/probe.ts` is the re-check server action: it answers `read` (nodes, doctor rows, source) or `refused`.
- `model/nodes.ts` is the six nodes with their commands (copied from the setup facts, none invented; an env command has a
  macOS / Linux line and a Windows PowerShell line); `model/judge.ts`
  turns a probe's readings into node states (`pass`, `fail`, `wait` behind an earlier failure, `unknown`).
- `components/`: `Wire`, `NodeDetail` (command, doctor's eleven capability rows), `useTrace`.

## Rules it keeps
- Unknown is never pass: a node not probed is `unknown`, and a node behind a failure is `wait`.
- Nothing is written: Trace shows commands, never runs them. Afterlife never reads or stores a token.
- Demo is never gated.

## Code map
| Path (under src/app/features/trace/) | Role |
|---|---|
| `TraceScreen.tsx`, `LiveGate.tsx` | The window; the layout's gate |
| `data/` | Server facts and the probe |
| `model/` | Nodes and commands, the judge, types |
| `components/` | Wire, node detail, the hook |
