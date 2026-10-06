// The credit rules, as pure functions. Belay credits a rung only when ALL hold on the rescan:
//   same engine before and after, not detector-only, exercised (not just configured), outside the noise band.
// "No lift: configured, not exercised" comes first: merging a job that has not run earns nothing.

/** Where a sent gap is in its life. 'probed' is the read-only probe's end state. */
export type Phase = 'probed' | 'opened' | 'merged' | 'ran' | 'nolift' | 'credited';

export type Outcome = 'nolift' | 'credited';

/** What a rescan decides for a gap that was merged. A change that needs a run must have run on main first. */
export function rescanOutcome(needsRun: boolean, phase: Phase): Outcome {
  return needsRun && phase !== 'ran' ? 'nolift' : 'credited';
}

export interface Check {
  mark: 'ok' | 'no' | 'q';
  text: string;
}

/** The four credit checks as the inspector lists them after a rescan. */
export function creditChecks(engine: string, needsRun: boolean, outcome: Outcome): Check[] {
  const exercised = outcome === 'credited' || !needsRun;
  return [
    { mark: 'ok', text: `same engine · ${engine} → ${engine}` },
    { mark: 'ok', text: `not detector-only · adds ${needsRun ? 'a job that must run and pass' : 'a policy GitLab enforces'}` },
    {
      mark: exercised ? 'ok' : 'no',
      text: exercised
        ? needsRun
          ? 'exercised · ran on main, Proof Block passed'
          : 'enforced · the policy blocks a merge'
        : 'exercised · not yet: configured, has not run on main',
    },
    {
      mark: exercised ? 'ok' : 'q',
      text: exercised ? 'outside the noise band · a whole rung' : 'noise band · nothing to compare yet',
    },
  ];
}

export interface TimelineStep {
  name: string;
  state: 'ok' | 'cur' | 'bad' | 'todo';
}

/** opened → merged → (ran) → rescan → credit, with the current step marked and a failed credit shown. */
export function timeline(phase: Phase, needsRun: boolean): TimelineStep[] {
  const names = ['opened', 'merged', ...(needsRun ? ['ran'] : []), 'rescan', 'credit'];
  const at = { opened: 1, merged: 2, ran: 3, nolift: 2, credited: names.length, probed: 0 }[phase];
  return names.map((name, i) => {
    let state: TimelineStep['state'] = i < at ? 'ok' : i === at ? 'cur' : 'todo';
    if (phase === 'nolift' && name === 'credit') state = 'bad';
    return { name, state };
  });
}
