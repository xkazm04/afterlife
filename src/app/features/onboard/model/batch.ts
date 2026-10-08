// The onboarding machine: one next action per project, and a batch that runs every read and at most N writes. A
// write opens an MR as you and then waits for a person to merge it; only a probe moves a project on. Pure.
import type { FleetProject } from '@/lib/demo/types';
import { rank, type Step } from './funnel';

/** A project's place in the run: its step, and what it waits for from a person (if anything). */
export interface ProjectRun {
  step: Step;
  /** merge: an MR waits; token: a stale feed needs a new project token; setup: setup is under way, its step unknown. */
  waiting: 'merge' | 'token' | 'setup' | null;
  /** The MR a write opened, while it waits for its merge (null when its number is not known). */
  mr: string | null;
  /** The repository that MR lives in (the project, or belay-policy for an arm MR). */
  mrRepo?: string;
  /** Moved by a simulated run in this session (the demo data has no ratings for a simulated scan). */
  simulated?: boolean;
}

export type ActionKind = 'scan' | 'poll' | 'bootstrap' | 'cycle' | 'merge' | 'token' | 'setup';

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
  const n = p.name;
  if (run.waiting === 'merge') {
    const into = run.step === 'watching' ? 'cycling' : 'paired';
    const repo = run.mrRepo ?? path;
    // the MR number without its "!": a bare !60 is history expansion in an interactive shell
    const cmd = run.mr ? `glab mr view ${run.mr.replace(/^!/, '')} -R ${repo} --web` : `glab mr list -R ${repo} --source-branch belay/bootstrap`;
    return { kind: 'merge', who: 'you', writes: 0, label: `Merge ${run.mr ?? 'the bootstrap MR'}`, cmd: [cmd], to: into };
  }
  if (run.waiting === 'token') {
    return {
      kind: 'token', who: 'you', writes: 0, label: 'Renew the project token',
      cmd: [`glab token create belay-reader -R ${path} --scope read_api --duration 30d`, '# keep it in .belay/ (local, never committed), then', 'npx belay doctor'],
      to: 'watching',
    };
  }
  if (run.waiting === 'setup') {
    return { kind: 'setup', who: 'you', writes: 0, label: 'Finish its setup (step not recorded)', cmd: ['npx belay doctor'], to: 'paired' };
  }
  switch (run.step) {
    case 'discovered':
      return { kind: 'scan', who: 'afterlife', writes: 0, label: 'Day-0 scan (read-only)', cmd: [`glab repo clone ${path}`, `(cd ${n} && npx belay scan)`], to: 'baselined' };
    case 'baselined':
      return {
        kind: 'bootstrap', who: 'you', writes: 1, label: 'Open the bootstrap MR',
        cmd: [
          `git -C ${n} switch -c belay/bootstrap`,
          `npx belay pair ${n} --write`,
          `git -C ${n} add -A && git -C ${n} commit -m "Belay bootstrap"`,
          `git -C ${n} push -u origin belay/bootstrap`,
          `glab mr create -R ${path} --source-branch belay/bootstrap --title "Belay bootstrap" --description "Policy record and proof jobs" --draft`,
        ],
        to: 'paired',
      };
    case 'paired':
      return { kind: 'poll', who: 'afterlife', writes: 0, label: 'First poll', cmd: ['npx belay doctor'], to: 'watching' };
    case 'watching':
      return {
        kind: 'cycle', who: 'you', writes: 1, label: 'Arm T6: open cycle C1',
        cmd: [
          `git -C belay-policy switch -c arm/t6-${n}`,
          `$EDITOR belay-policy/tier-state.yml   # arm T6 on ${path}`,
          `git -C belay-policy commit -am "Arm T6 maturity on ${n}"`,
          `git -C belay-policy push -u origin arm/t6-${n}`,
          `glab mr create -R ${org}/belay-policy --source-branch arm/t6-${n} --title "Arm T6 maturity on ${n}" --description "Opens cycle C1" --draft`,
        ],
        to: 'cycling',
      };
    default:
      return null;
  }
}

export interface Batch {
  /** Only a person can clear these: merges, tokens, unfinished setups. Listed first, never run by Afterlife. */
  yours: string[];
  /** Reads: every one runs, they cost nothing and write nothing. */
  reads: string[];
  /** Writes: at most `size`, bootstraps before first cycles (deeper onboarding first). */
  writes: string[];
}

/** The mean of a project's rated stages; null when none is rated (unknown is never zero). */
export function ratedMean(p: FleetProject): number | null {
  const rated = p.stages.filter((s): s is number => s != null);
  return rated.length ? rated.reduce((a, b) => a + b, 0) / rated.length : null;
}

/** Order by the rated mean (descending or ascending); projects with nothing rated always go last. Ties by name. */
const byMean = (dir: 1 | -1) => (a: FleetProject, b: FleetProject) => {
  const [x, y] = [ratedMean(a), ratedMean(b)];
  if (x == null || y == null) return x == null && y == null ? a.name.localeCompare(b.name) : x == null ? 1 : -1;
  return dir * (x - y) || a.name.localeCompare(b.name);
};

const PERSON: ReadonlySet<ActionKind> = new Set(['merge', 'token', 'setup']);

/**
 * The next batch. What only a person can do is listed for every project, whatever the scope; reads and writes only
 * for the projects in `inScope`. Bootstraps go to the best-baselined first (closest to a clean start), first cycles
 * to the weakest watched first (the most to gain); a project with nothing rated goes last either way.
 */
export function planBatch(
  projects: readonly FleetProject[],
  runs: Readonly<Record<string, ProjectRun>>,
  size: number,
  org: string,
  inScope: (p: FleetProject) => boolean = () => true,
): Batch {
  const out: Batch = { yours: [], reads: [], writes: [] };
  const boots: FleetProject[] = [];
  const cycles: FleetProject[] = [];
  for (const p of projects) {
    const run = runs[p.id];
    const a = run ? nextAction(p, run, org) : null;
    if (!a) continue;
    if (PERSON.has(a.kind)) out.yours.push(p.id);
    else if (!inScope(p)) continue;
    else if (a.writes === 0) out.reads.push(p.id);
    else (a.kind === 'bootstrap' ? boots : cycles).push(p);
  }
  boots.sort(byMean(-1));
  cycles.sort(byMean(1));
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
    if (a && run) next[id] = { ...run, step: a.to, simulated: true };
  }
  let mr = firstMr;
  for (const id of batch.writes) {
    const p = byId.get(id);
    const run = runs[id];
    if (!p || !run) continue;
    const repo = run.step === 'watching' ? `${org}/belay-policy` : pathOf(p, org);
    next[id] = { ...run, waiting: 'merge', mr: `!${mr++}`, mrRepo: repo, simulated: true };
  }
  return { runs: next, nextMr: mr };
}

/** A person did their part (merged, or renewed the token) and the probe confirmed it: the project moves on. */
export function resolve(runs: Readonly<Record<string, ProjectRun>>, id: string, p: FleetProject, org: string): Record<string, ProjectRun> {
  const run = runs[id];
  const a = run ? nextAction(p, run, org) : null;
  if (!run || !a || !PERSON.has(a.kind)) return { ...runs };
  return { ...runs, [id]: { step: a.to, waiting: null, mr: null, simulated: true } };
}

/** Is `a` further along than `b`? */
export const ahead = (a: Step, b: Step): boolean => rank(a) > rank(b);
