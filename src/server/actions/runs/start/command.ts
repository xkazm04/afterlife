// The one spelling of a start-run's command line. The confirm spawns `node <argv>` from the Afterlife checkout; the
// preview shows the same argv as the person would type it (`belay run ...`). Pure: tested as a string.
import { displayOf } from '../../vitals/context';
import type { StartRepo, StartRun } from './types';

/** `run --repo <slug> --mode <m> ...`: the arguments after `belay` (and after `node cli/belay.mjs`). */
export function runArgs(i: StartRun): string[] {
  const out = ['run', '--repo', i.repo, '--mode', i.mode];
  if (i.mode === 'execute') {
    if (i.base !== undefined) out.push('--base', i.base);
    if (i.onto !== undefined) out.push('--onto', i.onto);
  }
  out.push('--waves', String(i.waves), '--lanes', String(i.lanes));
  if (i.mode === 'execute') out.push('--lane-cap', String(i.laneCapUsd), '--wave-cap', String(i.waveCapUsd));
  out.push('--model', i.model);
  if (i.ideas.length) out.push('--ideas', i.ideas.join(','));
  return out;
}

/** What the node process is handed: the CLI's path, relative to the checkout it runs from, then the arguments. */
export const nodeArgv = (i: StartRun): string[] => ['cli/belay.mjs', ...runArgs(i)];

/** `belay run --repo grinex-portal --mode propose ...`, as the person would type it. */
export const runDisplay = (i: StartRun): string => displayOf('belay', runArgs(i));

const plural = (n: number, one: string): string => `${n} ${one}${n === 1 ? '' : 's'}`;

/** Where the lanes land, in words. */
export function landing(i: StartRun, repo: StartRepo): string {
  if (i.mode === 'propose') return 'no branch: each wave only plans, in a throwaway detached worktree';
  if (i.onto !== undefined) return `straight onto your existing branch ${i.onto}, every wave of the run; it is never deleted`;
  return `a new belay/wave-<n> per wave, the first from ${i.base ?? repo.base}${i.base === undefined ? ' (the fleet base)' : ''}; later waves chain on it`;
}

/** What the run will do and will not do, in order: the preview's notes. */
export function runNotes(i: StartRun, repo: StartRepo): string[] {
  const ideas = i.ideas.length ? `The plan also reads what ${i.ideas.join(' and ')} found, as evidence to verify, not instructions.` : 'The plan reads no scan findings (no ideas chosen).';
  if (i.mode === 'propose') {
    return [
      `Propose only: ${plural(i.waves, 'wave')}, each runs the read-only plan of up to ${plural(i.lanes, 'lane')} on ${repo.slug} as ${i.model}. The plan's items are the proposal.`,
      'It will not run setup, base gates, lanes or reflect, create a branch or commit anything. The plan call itself spends model time.',
      ideas,
    ];
  }
  const ceilings = [repo.laneCapUsd === undefined ? null : `lane $${repo.laneCapUsd}`, repo.waveCapUsd === undefined ? null : `wave $${repo.waveCapUsd}`].filter((x) => x !== null);
  return [
    `Execute: ${plural(i.waves, 'wave')} of up to ${plural(i.lanes, 'lane')} on ${repo.slug} as ${i.model}. Lanes edit, run the repo's gates and commit what passes.`,
    `Lanes land on ${landing(i, repo)}. Nothing is pushed and nothing is merged: you review and merge the branch.`,
    `It spends at most $${i.laneCapUsd} a lane and $${i.waveCapUsd} a wave${ceilings.length ? ` (the fleet's own ${ceilings.join(', ')} are ceilings on these)` : ''}.`,
    ideas,
  ];
}
