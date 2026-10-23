// The cost join: by the fleet file's gitlab key, else by slug; unmatched repos listed; no runner repo = absent, not $0.
import { describe, expect, it } from 'vitest';
import { costByProject, costProjects, sumCost } from './join';
import type { RunnerRow } from './types';

const row = (slug: string, over: Partial<RunnerRow> = {}): RunnerRow => ({ slug, inFleet: true, waves: 1, needs: 0, ...over });
const projects = costProjects(
  [
    { id: 'ledgerline', group: 'core-banking' },
    { id: 'fx-rates', group: 'risk', webUrl: 'https://gitlab.example.com/acme-lab/risk/fx-rates' },
    { id: 'kyc', group: 'risk' },
  ],
  'acme-lab',
);

describe('costByProject', () => {
  it('matches a gitlab key against the project path, the full path or its tail', () => {
    const j = costByProject({ rows: [row('local-ledger', { gitlab: 'acme-lab/core-banking/ledgerline', costUsd: 2.5, waves: 3 }), row('fx', { gitlab: 'risk/fx-rates', costUsd: 1 })] }, projects);
    expect(j.byProject.ledgerline).toEqual({ costUsd: 2.5, waves: 3, repos: ['local-ledger'] });
    expect(j.byProject['fx-rates']).toEqual({ costUsd: 1, waves: 1, repos: ['fx'] });
    expect(j.unmatched).toEqual([]);
  });

  it('reads a stored page address as the path, under a relative root too', () => {
    const p = costProjects([{ id: 'a', group: 'g', webUrl: 'https://h/gitlab/acme/g/a' }], 'acme');
    expect(costByProject({ rows: [row('x', { gitlab: 'acme/g/a', costUsd: 1 })] }, p).byProject.a?.costUsd).toBe(1);
  });

  it('falls back to slug === project id, when no key is set or the key matches nothing', () => {
    const j = costByProject({ rows: [row('kyc', { costUsd: 0.4 }), row('fx-rates', { gitlab: 'other/typo', costUsd: 2 })] }, projects);
    expect(j.byProject.kyc?.costUsd).toBe(0.4);
    expect(j.byProject['fx-rates']?.costUsd).toBe(2);
  });

  it('lists a runner repo that matches no project, and drops none', () => {
    const j = costByProject({ rows: [row('paypal', { costUsd: 9 }), row('athena', { gitlab: 'elsewhere/athena' })] }, projects);
    expect(j.unmatched).toEqual(['paypal', 'athena']);
    expect(j.byProject).toEqual({});
  });

  it('an ambiguous key tail matches nothing rather than a guess', () => {
    const p = costProjects([{ id: 'api', group: 'a' }, { id: 'api', group: 'b' }], 'acme');
    expect(costByProject({ rows: [row('x', { gitlab: 'api' })] }, p).unmatched).toEqual(['x']);
  });

  it('a matched repo that reported no cost is null, not $0; a project no repo works is absent', () => {
    const j = costByProject({ rows: [row('kyc', { waves: 0 })] }, projects);
    expect(j.byProject.kyc).toEqual({ costUsd: null, waves: 0, repos: ['kyc'] });
    expect('ledgerline' in j.byProject).toBe(false);
  });

  it('sums two repos on one project', () => {
    const j = costByProject({ rows: [row('kyc', { costUsd: 1, waves: 2 }), row('kyc-2', { gitlab: 'acme-lab/risk/kyc', costUsd: 0.5 })] }, projects);
    expect(j.byProject.kyc).toEqual({ costUsd: 1.5, waves: 3, repos: ['kyc', 'kyc-2'] });
  });
});

describe('sumCost (a group, or the fleet)', () => {
  const by = { a: { costUsd: 2, waves: 1, repos: ['a'] }, b: { costUsd: null, waves: 0, repos: ['b'] }, c: { costUsd: 0.5, waves: 1, repos: ['c'] } };
  it('sums the known costs and says how many of the projects are metered', () => {
    expect(sumCost(by, ['a', 'b', 'c', 'd'])).toEqual({ costUsd: 2.5, metered: 2, of: 4 });
  });
  it('all unknown is null, never $0', () => {
    expect(sumCost(by, ['b', 'd'])).toEqual({ costUsd: null, metered: 0, of: 2 });
    expect(sumCost({}, [])).toEqual({ costUsd: null, metered: 0, of: 0 });
  });
});
