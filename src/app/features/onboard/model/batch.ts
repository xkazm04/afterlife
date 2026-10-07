// The onboarding machine: one next action per project, and a batch that runs every read and at most N writes. A
// write opens an MR as you and then waits for a person to merge it; only a probe moves a project on. Pure.
import type { FleetProject } from '@/lib/demo/types';
import { rank, type Step } from './funnel';

/** A project's place in the run: its step, and what it waits for from a person (if anything). */
export interface ProjectRun {
  step: Step;
  waiting: 'merge' | 'token' | null;
  /** The MR a write opened, while it waits for its merge. */
  mr: string | null;
}

export type ActionKind = 'scan' | 'poll' | 'bootstrap' | 'cycle' | 'merge' | 'token';

export interface NextAction {
  kind: ActionKind;
  /** Afterlife does reads on its own; writes go as you; merges and tokens only a person can do. */
  who: 'afterlife' | 'you';
  /** MRs this action opens. */
  writes: number;
  label: string;
  /** The exact commands, shown before anything runs. */
  cmd: string[];
  /** The step a probe moves the project to once the action is done (and merged, for a write). */
  to: Step;
}

export const pathOf = (p: FleetProject, org: string): string => `${org}/${p.group}/${p.name}`;

/** The one next action for a project, or null when it is already in cycles. */
export function nextAction(p: FleetProject, run: ProjectRun, org: string): NextAction | null {
  const path = pathOf(p, org);
  if (run.waiting === 'merge') {
    const into = run.step === 'watching' ? 'cycling' : 'paired';
    return { kind: 'merge', who: 'you', writes: 0, label: `Merge ${run.mr ?? 'the MR'}`, cmd: [`glab mr view ${run.mr ?? ''} -R ${path} --web`], to: into };
  }
  if (run.waiting === 'token') {
    return { kind: 'token', who: 'you', writes: 0, label: 'Renew the project token', cmd: [`glab token create belay-reader -R ${path} --scope read_api`, 'npx belay doctor'], to: 'watching' };
  }
  switch (run.step) {
    case 'discovered':
      return { kind: 'scan', who: 'afterlife', writes: 0, label: 'Day-0 scan (read-only)', cmd: [`npx belay scan --project ${path}`], to: 'baselined' };
    case 'baselined':
      return {
        kind: 'bootstrap', who: 'you', writes: 1, label: 'Open the bootstrap MR',
        cmd: [`git -C ${p.name} switch -c belay/bootstrap`, `npx belay pair ${p.name} belay-pack`, `glab mr create -R ${path} --source-branch belay/bootstrap --title "Belay bootstrap" --fill`],
        to: 'paired',
      };
    case 'paired':
      return { kind: 'poll', who: 'afterlife', writes: 0, label: 'First poll', cmd: [`npx belay doctor --project ${path}`], to: 'watching' };
    case 'watching':
      return {
        kind: 'cycle', who: 'you', writes: 1, label: 'Arm T6: open cycle C1',
        cmd: [`glab mr create -R ${org}/belay-policy --source-branch arm/t6-${p.name} --title "Arm T6 maturity on ${p.name}" --fill`],
        to: 'cycling',
      };
    default:
      return null;
  }
}

export interface Batch {
  /** Only a person can clear these: merges and tokens. Listed first, never run by Afterlife. */
  yours: string[];
  /** Reads: every one runs, they cost nothing and write nothing. */
  reads: string[];
  /** Writes: at most `size`, bootstraps before first cycles (deeper onboarding first). */
  writes: string[];
}

const total = (p: FleetProject): number => p.stages.reduce<number>((n, s) => n + (s ?? 0), 0);

/**
 * The next batch. Bootstraps go to the best-baselined projects first (closest to a clean start); first cycles go to
 * the weakest watched projects first (the most to gain). Ties by name, so a batch is stable.
 */
export function planBatch(projects: readonly FleetProject[], runs: Readonly<Record<string, ProjectRun>>, size: number, org: string): Batch {
  const out: Batch = { yours: [], reads: [], writes: [] };
  const boots: FleetProject[] = [];
  const cycles: FleetProject[] = [];
  for (const p of projects) {
    const run = runs[p.id];
    const a = run ? nextAction(p, run, org) : null;
    if (!a) continue;
    if (a.kind === 'merge' || a.kind === 'token') out.yours.push(p.id);
    else if (a.writes === 0) out.reads.push(p.id);
    else (a.kind === 'bootstrap' ? boots : cycles).push(p);
  }
  boots.sort((a, b) => total(b) - total(a) || a.name.localeCompare(b.name));
  cycles.sort((a, b) => total(a) - total(b) || a.name.localeCompare(b.name));
  out.writes = [...boots, ...cycles].slice(0, Math.max(0, size)).map((p) => p.id);
  return out;
}

/**
 * Run a batch (simulated in the demo): reads land at once, as their probe would confirm; each write opens an MR
 * numbered from `firstMr` and waits for its merge. Projects outside the batch, and the person steps, do not move.
 */
export function runBatch(runs: Readonly<Record<string, ProjectRun>>, batch: Batch, projects: readonly FleetProject[], firstMr: number, org: string) {
  const next: Record<string, ProjectRun> = { ...runs };
  const byId = new Map(projects.map((p) => [p.id, p]));
  for (const id of batch.reads) {
    const p = byId.get(id);
    const run = runs[id];
    const a = p && run ? nextAction(p, run, org) : null;
    if (a && run) next[id] = { ...run, step: a.to };
  }
  let mr = firstMr;
  for (const id of batch.writes) {
    const run = runs[id];
    if (run) next[id] = { ...run, waiting: 'merge', mr: `!${mr++}` };
  }
  return { runs: next, nextMr: mr };
}

/** A person did their part (merged, or renewed the token) and the probe confirmed it: the project moves on. */
export function resolve(runs: Readonly<Record<string, ProjectRun>>, id: string, p: FleetProject, org: string): Record<string, ProjectRun> {
  const run = runs[id];
  const a = run ? nextAction(p, run, org) : null;
  if (!run || !a || (a.kind !== 'merge' && a.kind !== 'token')) return { ...runs };
  return { ...runs, [id]: { step: a.to, waiting: null, mr: null } };
}

/** Is `a` further along than `b`? */
export const ahead = (a: Step, b: Step): boolean => rank(a) > rank(b);
