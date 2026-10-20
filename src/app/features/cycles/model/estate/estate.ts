// The estate in cycles: every project whose ledger records a closed cycle, rolled up per group. Pure. Each project's
// history is held to account against its own rungs today: unwound to day 0 and replayed, it must hold the chain and
// land exactly on the fleet's rungs, or the row says it does not reconcile.
import type { CycleHistory } from '@/lib/demo/cycleTypes';
import type { FleetProject } from '@/lib/demo/types';
import { STAGES, type Stage } from '@/schemas/stages';
import { chainBreaks, moves, reconcile, replay, summarize, total } from '../replay';
import type { Cycle, CycleSummary, Rungs } from '../types';

export interface EstateProject {
  id: string;
  name: string;
  group: string;
  closed: number;
  /** Days since the project's day 0, and since its last closing rescan. */
  today: number;
  sinceClose: number | null;
  /** Summed over its closed cycles. */
  sum: CycleSummary;
  held: number;
  unknown: number;
  /** Stages whose replayed history disagrees with today's rungs, and changes that break the chain. */
  drift: Stage[];
  breaks: number;
  cycles: readonly Cycle[];
}

export interface EstateGroup {
  group: string;
  /** Projects in the group the fleet watches, and how many of them are in cycles. */
  watching: number;
  projects: EstateProject[];
  sum: CycleSummary;
  closed: number;
}

export interface EstateData {
  org: string;
  deep: string;
  groups: EstateGroup[];
  /** Watching projects with no cycle record: Onboard can arm them. */
  notCycling: number;
  sum: CycleSummary;
  closed: number;
  inCycles: number;
  /** Projects whose history reconciles with their rungs today. */
  reconciled: number;
}

const ZERO: CycleSummary = { sent: 0, credited: 0, missed: 0, regressed: 0, resolved: 0, net: 0 };
const add = (a: CycleSummary, b: CycleSummary): CycleSummary => ({
  sent: a.sent + b.sent, credited: a.credited + b.credited, missed: a.missed + b.missed,
  regressed: a.regressed + b.regressed, resolved: a.resolved + b.resolved, net: a.net + b.net,
});

const rungsOf = (p: FleetProject): Rungs => Object.fromEntries(STAGES.map((s, i) => [s, p.stages[i] ?? null])) as Rungs;

/** Day 0 as the history implies it: today's rungs with every moving change taken back, newest first. */
export function unwind(now: Rungs, cycles: readonly Cycle[]): Rungs {
  const out: Record<Stage, number | null> = { ...now };
  for (const cy of [...cycles].reverse()) {
    if (cy.state !== 'closed') continue;
    for (const c of [...cy.changes].reverse()) if (moves(c)) out[c.stage] = c.from;
  }
  return out;
}

function project(p: FleetProject, h: CycleHistory): EstateProject {
  const now = rungsOf(p);
  const closed = h.cycles.filter((c) => c.state === 'closed');
  const day0 = unwind(now, closed);
  const last = closed.at(-1);
  return {
    id: p.id, name: p.name, group: p.group, closed: closed.length, today: h.today,
    sinceClose: last?.closedDay == null ? null : h.today - last.closedDay,
    sum: closed.map(summarize).reduce(add, ZERO),
    held: total(now), unknown: STAGES.filter((s) => now[s] === null).length,
    drift: reconcile(replay(day0, closed).at(-1) ?? day0, now), breaks: chainBreaks(day0, closed).length,
    cycles: closed,
  };
}

export function buildEstate(org: string, deep: string, groups: readonly string[], projects: readonly FleetProject[], histories: Readonly<Record<string, CycleHistory>>): EstateData {
  const out: EstateGroup[] = groups.map((g) => {
    const inGroup = projects.filter((p) => p.group === g);
    const rows = inGroup.flatMap((p) => {
      const h = histories[p.id];
      return h && h.cycles.length ? [project(p, h)] : [];
    });
    return {
      group: g, watching: inGroup.filter((p) => p.state === 'watching').length, projects: rows,
      sum: rows.map((r) => r.sum).reduce(add, ZERO), closed: rows.reduce((n, r) => n + r.closed, 0),
    };
  });
  const rows = out.flatMap((g) => g.projects);
  return {
    org, deep, groups: out,
    notCycling: projects.filter((p) => p.state === 'watching' && !rows.some((r) => r.id === p.id)).length,
    sum: out.map((g) => g.sum).reduce(add, ZERO), closed: rows.reduce((n, r) => n + r.closed, 0), inCycles: rows.length,
    reconciled: rows.filter((r) => r.drift.length === 0 && r.breaks === 0).length,
  };
}
