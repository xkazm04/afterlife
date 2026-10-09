import { describe, expect, it } from 'vitest';
import { creditChecks, rescanOutcome, timeline } from './credit';

describe('rescanOutcome', () => {
  it('no lift when a job was merged but has not run: configured, not exercised', () => {
    expect(rescanOutcome(true, 'merged')).toBe('nolift');
    expect(rescanOutcome(true, 'nolift')).toBe('nolift');
  });
  it('credits once the job ran on main', () => {
    expect(rescanOutcome(true, 'ran')).toBe('credited');
  });
  it('credits a policy GitLab enforces straight after the merge', () => {
    expect(rescanOutcome(false, 'merged')).toBe('credited');
  });
});

describe('creditChecks', () => {
  it('lists the four rules, with the exercised check failing on no lift', () => {
    const c = creditChecks(true, 'nolift');
    expect(c.map((x) => x.mark)).toEqual(['q', 'q', 'no', 'q']);
    expect(c[0]?.text).toBe('same engine · not checked');
    expect(c[2]?.text).toBe('exercised · not yet: configured, has not run on main');
    expect(c[3]?.text).toBe('noise band · nothing to compare yet');
  });
  it('passes the two it checks once credited; same engine and not detector-only are never checked, so never passed', () => {
    const c = creditChecks(true, 'credited');
    expect(c.map((x) => x.mark)).toEqual(['q', 'q', 'ok', 'ok']);
    expect(c[1]?.text).toBe('not detector-only · not checked');
    expect(c[2]?.text).toBe('exercised · ran on main, Proof Block passed');
  });
  it('words an enforced policy differently from a job that ran', () => {
    const c = creditChecks(false, 'credited');
    expect(c[2]?.text).toBe('enforced · the policy blocks a merge');
  });
});

describe('timeline', () => {
  const states = (p: Parameters<typeof timeline>[0], run: boolean) => timeline(p, run).map((t) => `${t.name}:${t.state}`);
  it('has a ran step only when the change needs a run', () => {
    expect(states('opened', true)).toEqual(['opened:ok', 'merged:cur', 'ran:todo', 'rescan:todo', 'credit:todo']);
    expect(states('opened', false)).toEqual(['opened:ok', 'merged:cur', 'rescan:todo', 'credit:todo']);
  });
  it('marks a failed credit as bad and waits at the ran step', () => {
    expect(states('nolift', true)).toEqual(['opened:ok', 'merged:ok', 'ran:cur', 'rescan:todo', 'credit:bad']);
  });
  it('completes when credited', () => {
    expect(states('credited', false).every((s) => s.endsWith(':ok'))).toBe(true);
  });
});
