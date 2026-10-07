// The open end of the loop: the running cycle is what Maturity has picked, the planned one is what it has not, plus
// anything a closed cycle tried and did not earn. Derived from the Maturity proposals, so the two screens never drift.
import type { MaturityProposal } from '@/lib/demo/types';
import type { Stage } from '@/schemas/stages';
import { PHASES, type Cycle, type CycleChange, type Phase } from './types';

export interface OpenCycles {
  running: Cycle;
  planned: Cycle;
}

/**
 * Changes a closed cycle tried and did not earn, whose stage has not reached that rung since. One per stage and
 * target (the newest try wins), rebased to start where the stage stands now. Oldest first.
 */
export function carried(closed: readonly Cycle[], now: Readonly<Record<Stage, number | null>>): (CycleChange & { from_cycle: string })[] {
  const out = new Map<string, CycleChange & { from_cycle: string }>();
  for (const cy of closed) {
    for (const c of cy.changes) {
      if ((c.verdict === 'rejected' || c.verdict === 'nolift') && (now[c.stage] ?? -1) < c.to) {
        const key = `${c.stage}:${c.to}`;
        out.delete(key);
        out.set(key, { ...c, from: now[c.stage] ?? null, from_cycle: cy.id });
      }
    }
  }
  return [...out.values()];
}

const fromProposal = (p: MaturityProposal, verdict: 'pending' | 'planned', why: string): CycleChange => ({
  mr: null,
  gap: p.id,
  kind: p.diffLines > 0 ? 'mr' : 'probe',
  stage: p.stage,
  from: p.from,
  to: p.to,
  title: p.title,
  verdict,
  why,
  lines: p.diffLines || undefined,
});

/**
 * The running cycle (picked gaps, waiting at Send) and the planned one (the rest). A planned change that retries a
 * carried one says so; a carried change no proposal covers is planned as-is.
 */
export function openCycles(
  closed: readonly Cycle[],
  proposals: readonly MaturityProposal[],
  now: Readonly<Record<Stage, number | null>>,
  today: number,
  cadence: number,
): OpenCycles {
  const last = closed[closed.length - 1];
  const n = (last?.n ?? 0) + 1;
  const engine = last?.engine ?? 'v1';
  const carry = carried(closed, now);
  const retry = (p: MaturityProposal) => carry.find((c) => c.stage === p.stage && c.to === p.to);

  const picked = proposals.filter((p) => p.picked);
  const running: Cycle = {
    id: `C${n}`, n, theme: themeOf(picked), state: 'running', openedDay: today, closedDay: null, engine,
    phase: picked.length ? 'send' : 'pick',
    changes: picked.map((p) => fromProposal(p, 'pending', 'picked · waits for Send as you')),
  };

  const rest = proposals.filter((p) => !p.picked);
  const planned: Cycle = {
    id: `C${n + 1}`, n: n + 1, theme: themeOf(rest), state: 'planned', openedDay: today + cadence, closedDay: null, engine, phase: 'scan',
    changes: [
      ...rest.map((p) => {
        const r = retry(p);
        return fromProposal(p, 'planned', r ? `retries ${r.mr ?? r.kind} from ${r.from_cycle}: ${r.why}` : 'proposed by the T6 autopilot; not picked yet');
      }),
      ...carry
        .filter((c) => !rest.some((p) => p.stage === c.stage && p.to === c.to) && !picked.some((p) => p.stage === c.stage && p.to === c.to))
        .map(({ from_cycle, ...c }) => ({ ...c, mr: null, verdict: 'planned' as const, why: `carried from ${from_cycle}: ${c.why}` })),
    ],
  };
  return { running, planned };
}

function themeOf(ps: readonly MaturityProposal[]): string {
  if (!ps.length) return 'Nothing picked yet';
  const stages = [...new Set(ps.map((p) => p.stage))];
  return stages.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' and ');
}

/** One step of the loop rail. */
export interface RailStep {
  phase: Phase;
  state: 'done' | 'current' | 'todo';
}

/** Where a cycle stands on the six phases: closed is all done, planned is all to do. */
export function rail(cycle: Cycle): RailStep[] {
  const at = PHASES.indexOf(cycle.phase);
  return PHASES.map((phase, i) => ({
    phase,
    state: cycle.state === 'closed' ? 'done' : cycle.state === 'planned' ? 'todo' : i < at ? 'done' : i === at ? 'current' : 'todo',
  }));
}
