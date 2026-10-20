// The Onboard screen's data and its starting point, built once on the server from the fleet. Pure.
import type { FleetProject } from '@/lib/demo/types';
import type { ProjectRun } from './batch';
import { setupStepNumber, stepOf } from './funnel';

export interface OnboardData {
  /** The GitLab group the estate lives in ("acme-lab") and its host. */
  org: string;
  host: string;
  groups: string[];
  projects: FleetProject[];
  /** Projects already in a cycle history. */
  cycling: string[];
  /** The poll clock ("14:22"). */
  asOf: string;
}

/**
 * Where every project starts: its funnel step, plus what it already waits for from a person. A setting-up project
 * whose bootstrap MR waits for a merge waits on it (its number is not in the data, so it is looked up by branch); one
 * with no recorded step waits for its setup to be finished; a stale feed (an expired token) waits on a new token.
 */
export function initialRuns(data: OnboardData): Record<string, ProjectRun> {
  const cycling = new Set(data.cycling);
  const out: Record<string, ProjectRun> = {};
  for (const p of data.projects) {
    const step = stepOf(p, cycling);
    const waitsMerge = p.state === 'setting-up' && /waits for your merge/.test(p.setupStep ?? '') && setupStepNumber(p) < 11;
    const setupUnknown = p.state === 'setting-up' && !p.setupStep;
    out[p.id] = {
      step,
      waiting: waitsMerge ? 'merge' : p.state === 'stale' ? 'token' : setupUnknown ? 'setup' : null,
      mr: null,
    };
  }
  return out;
}
