import { describe, expect, it } from 'vitest';
import { getActionClasses, getTracks } from '@/lib/demo';
import { HUMAN_KEY, promotion, type Promotion } from '@/lib/promotion';
import { repoPolicy } from '@/server/data/policy';
import type { ClassRow, TrackMap } from '../types';
import { proofClassOf } from '../view/filters';
import { promoteAsk, promoteTarget, sentWords } from './promote';

const row = (id: string, o: Partial<ClassRow> = {}): ClassRow => ({
  id, track: 'T1', ceiling: 'hands_off', tier: 'supervised', lease_days: null, record: null, lastMove: '', pending: null, ...o,
});
const eligible: Promotion = { kind: 'eligible', next: 'hands_off', rules: [], precondition: HUMAN_KEY };
const ask = { id: 'promote:ledgerline:a', from: 'supervised' as const, to: 'hands_off' as const, rules: [] };

describe('promoteTarget', () => {
  it('goes one rung up when eligible, and to Assisted (never the old tier) from a quarantine', () => {
    expect(promoteTarget(eligible)).toBe('hands_off');
    expect(promoteTarget({ kind: 'readmit' })).toBe('assisted');
  });
  it('is null for anything the rule does not call eligible', () => {
    expect(promoteTarget({ kind: 'notyet', next: 'hands_off', rules: [], precondition: HUMAN_KEY })).toBeNull();
    for (const kind of ['never', 'ceiling', 'norecord', 'split', 'untiered'] as const) expect(promoteTarget({ kind })).toBeNull();
    expect(promoteTarget({ kind: 'nopolicy', next: 'supervised' })).toBeNull();
  });
});

describe('promoteAsk', () => {
  it('names the live ask it settles only when one is open for that same step', () => {
    expect(promoteAsk(row('a', { ask }), eligible)).toEqual({ id: 'a', to: 'hands_off', readmit: false, proposal: 'promote:ledgerline:a' });
    expect(promoteAsk(row('a', { ask: { ...ask, to: 'supervised' } }), eligible)).toEqual({ id: 'a', to: 'hands_off', readmit: false });
  });
  it('no ask (closed unmerged, or never opened): still a promotion, with no proposal', () => {
    expect(promoteAsk(row('a'), eligible)).toEqual({ id: 'a', to: 'hands_off', readmit: false });
  });
  it('a quarantine is re-admitted at Assisted', () => {
    expect(promoteAsk(row('q', { tier: 'quarantined' }), { kind: 'readmit' })).toEqual({ id: 'q', to: 'assisted', readmit: true });
  });
  it('demo: qa.file-bug (repro, now a checked proof) asks for Hands-off; patch-bump re-admits; a human-only class asks nothing', () => {
    const tracks: TrackMap = Object.fromEntries(getTracks().map((t) => [t.id, t]));
    const of = (id: string) => {
      const c = { ...getActionClasses().find((x) => x.id === id)!, pending: null } as ClassRow;
      return promoteAsk(c, promotion(c, proofClassOf(tracks, c), repoPolicy()));
    };
    expect(of('qa.file-bug')).toEqual({ id: 'qa.file-bug', to: 'hands_off', readmit: false });
    expect(of('patch-bump')).toEqual({ id: 'patch-bump', to: 'assisted', readmit: true });
    expect(of('report.submit')).toBeNull();
  });
});

describe('sentWords', () => {
  it('names the MR GitLab opened, or says the demo simulated it', () => {
    expect(sentWords({ kind: 'sent', mr: '!22', url: 'https://gitlab.com/x/-/merge_requests/22', simulated: false })).toMatch(/^Opened !22 · a person merges it/);
    expect(sentWords({ kind: 'sent', mr: null, url: null, simulated: true })).toMatch(/^Simulated · demo mode/);
    expect(sentWords({ kind: 'sent', mr: null, url: null, simulated: false })).toBe('MR opened · GitLab named none');
  });
});
