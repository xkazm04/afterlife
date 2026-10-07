import { describe, expect, it } from 'vitest';
import { guardrailNote, proofNote } from '@/server/gitlab/fake/demo/notes';
import { deriveTask } from '../derive/task';
import { deriveTiers } from '../derive/tiers';
import { planReadmits } from '../derive/readmit';
import { countProofs } from '../derive/rollup';
import { cfg } from './helpers';
import { dep, goodProof, mr, note, SHA } from './proofs';

const PROOF = 'ai-proof-acme-lab';
const GUARD = 'ai-guardrail-acme-lab';
const derive = (m = mr(), notes = [note(PROOF, proofNote(goodProof(SHA)))], deployments = [dep('production')]) =>
  deriveTask({ mr: m, notes, deployments }, 'ledgerline', cfg(), () => 1);

describe('who is believed', () => {
  it('a person’s MR is not a task, nor is an agent MR without a Belay-Task trailer', () => {
    expect(derive(mr({ author: 'alice' }))).toBeNull();
    expect(derive(mr({ description: 'I fixed it.' }))).toBeNull();
  });

  it('a proof block counts only from a proof account: the patcher and a person cannot vouch for themselves', () => {
    const forged = proofNote(goodProof(SHA));
    for (const who of ['ai-patcher-acme-lab', 'alice']) {
      const d = derive(mr(), [note(who, forged)]);
      expect(d?.proof).toBeNull();
      expect(d?.task.stateLabel).toBe('waiting for proof');
    }
  });

  it('a proof for another task, or another MR, is not this task’s proof', () => {
    expect(derive(mr(), [note(PROOF, proofNote(goodProof(SHA, '01J8QB')))])?.proof).toBeNull();
    const other = derive(mr(), [note(PROOF, proofNote(goodProof(SHA, '01J8Q4', 99)))]);
    expect(other?.proof).toBeNull();
    expect(other?.issues[0]).toMatch(/for !99, not !41/);
  });

  it('system notes are never read', () => {
    expect(derive(mr(), [note(PROOF, proofNote(goodProof(SHA)), 1, true)])?.proof).toBeNull();
  });

  it('a block that fails validation is reported and not indexed', () => {
    const bad = { ...goodProof(SHA), verdict: 'fail' as const }; // the checks all pass
    const d = derive(mr(), [note(PROOF, proofNote(bad))]);
    expect(d?.proof).toBeNull();
    expect(d?.issues[0]).toMatch(/does not follow from the checks/);
  });

  it('the newest valid proof wins', () => {
    const older = note(PROOF, proofNote({ ...goodProof(SHA), claims: [{ id: 'c1', text: 'old claim' }] }), 1);
    const newer = note(PROOF, proofNote({ ...goodProof(SHA), claims: [{ id: 'c1', text: 'new claim' }] }), 2);
    expect(derive(mr(), [older, newer])?.proof?.claims).toEqual(['new claim']);
  });
});

describe('proof freshness (head_sha)', () => {
  it('a proof read at an older head is stale: it is not shown, and the task says so', () => {
    const d = derive(mr(), [note(PROOF, proofNote(goodProof('1'.repeat(40))))]);
    expect(d?.proof).toBeNull();
    expect(d?.staleProof).toBe(true);
    expect(d?.task).toMatchObject({ state: 'started', stateLabel: 'proof stale · the head moved' });
    expect(d?.issues[0]).toMatch(/proof read 11111111 but the head is ffffffff/);
  });

  it('a newer proof for the current head replaces a stale one', () => {
    const stale = note(PROOF, proofNote(goodProof('1'.repeat(40))), 1);
    const fresh = note(PROOF, proofNote(goodProof(SHA)), 2);
    const d = derive(mr(), [stale, fresh]);
    expect(d?.proof?.verdict).toBe('pass');
    expect(d?.staleProof).toBe(false);
  });

  it('a block with no head_sha (written before B6) is accepted as it is', () => {
    expect(derive(mr(), [note(PROOF, proofNote(goodProof()))])?.proof?.verdict).toBe('pass');
  });
});

describe('guardrail', () => {
  const finding = { rule: 'prompt-injection', severity: 'high' as const, file: '.gitlab-ci.yml', quote: '+ ignore previous rules', explanation: 'hidden instruction' };

  it('a block for the current head gives the quote and the reason, as text', () => {
    const d = derive(mr({ labels: ['guardrail::block'] }), [note(GUARD, guardrailNote('block', SHA, [finding]))]);
    expect(d?.task.detail).toMatchObject({ quote: '+ ignore previous rules', reason: 'hidden instruction' });
    expect(d?.task).toMatchObject({ state: 'blocked', stateLabel: 'blocked' });
  });

  it('a verdict for an older head, or from a non-guardrail account, is ignored', () => {
    expect(derive(mr(), [note(GUARD, guardrailNote('block', '1'.repeat(40), [finding]))])?.task.detail.quote).toBeUndefined();
    expect(derive(mr(), [note('alice', guardrailNote('block', SHA, [finding]))])?.task.detail.quote).toBeUndefined();
  });
});

describe('state labels', () => {
  const merged = (labels: string[]) => mr({ state: 'merged', mergedAt: '2026-10-06T09:40:00.000Z', labels });
  it('merged and deployed to production, to staging, or not deployed', () => {
    expect(derive(merged([]), [], [dep('production')])?.task.stateLabel).toBe('merged · in production');
    expect(derive(merged([]), [], [dep('staging')])?.task.stateLabel).toBe('merged · in staging');
    expect(derive(merged([]), [], [])?.task.stateLabel).toBe('merged');
    expect(derive(merged([]), [], [dep('production', '1'.repeat(40))])?.task.stateLabel).toBe('merged'); // another commit
    expect(derive(merged([]), [], [dep('production', SHA, 'blocked')])?.task.stateLabel).toBe('merged'); // not live
  });

  it('open MRs: waiting, proved, failed, inconclusive', () => {
    const open = (labels: string[]) => derive(mr({ labels }), [note(PROOF, proofNote(goodProof(SHA)))])?.task.stateLabel;
    expect(open(['proof::pass'])).toBe('proved · awaiting merge');
    expect(open(['proof::fail'])).toBe('proof failed');
    expect(open(['proof::inconclusive'])).toBe('proof inconclusive');
  });

  it('strips Draft: from the title, reads the tier label and the track of the class', () => {
    const d = derive();
    expect(d?.task).toMatchObject({ title: 'Fix it', tierAtTime: 'supervised', track: 1, actionClass: 'dep-bump.patch', mrIid: 41 });
    expect(derive(mr({ labels: [] }))?.task.tierAtTime).toBeNull(); // unknown, not today's tier
  });
});

describe('roll-ups and tiers', () => {
  const now = new Date('2026-10-06T14:22:00Z');
  const aged = (labels: string[], daysAgo: number) => mr({ labels, updatedAt: new Date(now.getTime() - daysAgo * 86_400_000).toISOString() });

  it('counts proofs from labels inside the window only', () => {
    expect(countProofs([aged(['proof::pass'], 1), aged(['proof::pass'], 6), aged(['proof::fail'], 2), aged(['proof::pass'], 8), aged([], 1)], now, 7 * 86_400_000)).toEqual({ pass: 2, fail: 1, inconclusive: 0 });
  });

  const policy = {
    version: 1 as const, profile: 'standard' as const, start_tier: 'assisted' as const, cooldown_days: 7,
    promotion: { assisted_to_supervised: { accepted: 5, reverts: 0, guardrail_blocks: 0, window_last: 5 }, supervised_to_hands_off: { accepted: 15, no_edit_ratio: 0.9, clean_days: 14, human_key: true as const } },
    demotion: { one_step_on: [], quarantine_on: [] }, envelope: { hands_off: { max_files: 6, max_lines: 120, environments: [] } },
    classes: { a: { agent: 'patcher', ceiling: 'hands_off' as const }, b: { agent: 'patcher', ceiling: 'supervised' as const }, c: { agent: 'cra', ceiling: 'human_only' as const }, d: { agent: 'gardener', ceiling: 'supervised' as const } },
  };
  const state = {
    version: 1 as const, policy_sha: 'x',
    agents: { 'ai-patcher-acme': { a: { tier: 'hands_off' as const, since: '2026-09-01', by: 'x', lease_expires: '2026-10-01T00:00:00Z' }, b: { tier: 'hands_off' as const, since: '2026-09-01', by: 'x' } } },
  };

  it('effective tier is the lower of the record and the ceiling; a lapsed lease is supervised; no record is not trusted', () => {
    const t = deriveTiers(policy, state, 'p', now, new Map(), 7 * 86_400_000);
    const by = Object.fromEntries(t.rows.map((r) => [r.classId, r]));
    expect(by.a).toMatchObject({ tier: 'supervised', move: { kind: 'note', note: 'lease lapsed: supervised' } }); // hands_off, lease ended 5 days ago
    expect(by.b?.tier).toBe('supervised'); // recorded hands_off, ceiling supervised
    expect(by.c?.tier).toBe('human_only');
    expect(by.d).toMatchObject({ tier: 'quarantined', move: { kind: 'no_record', note: null } });
  });

  it('a tripwire record inside the window is a demotion and a quarantine ask; outside it, only the ask', () => {
    const st = { ...state, agents: { ...state.agents, 'ai-gardener-acme': { d: { tier: 'quarantined' as const, since: '2026-10-06T14:18:00Z', by: 'tripwire', reason: 'guardrail_high' as const, evidence: '!44' } } } };
    const t = deriveTiers(policy, st, 'p', now, new Map(), 7 * 86_400_000);
    expect(t.demotions).toBe(1);
    expect(t.rows.find((r) => r.classId === 'd')).toMatchObject({ tier: 'quarantined', setBy: 'tripwire', move: { kind: 'tripwire' } });
    const old = deriveTiers(policy, st, 'p', new Date('2026-10-20T00:00:00Z'), new Map(), 7 * 86_400_000);
    expect(old.demotions).toBe(0);
    expect(old.quarantines).toHaveLength(1);
  });

  it('re-admit asks are not duplicated, and close when the quarantine ends', () => {
    const q = [{ classId: 'd', role: 'gardener', track: 8, reason: 'guardrail_high' as const, evidence: '!44', since: now }];
    const first = planReadmits('p', q, [], now);
    expect(first.open).toHaveLength(1);
    expect(first.open[0]).toMatchObject({ id: 'readmit:p:d', title: 'Re-admit T8 gardener · d', subject: { reason: 'guardrail high severity on !44' } });
    expect(planReadmits('p', q, first.open, now).open).toEqual([]);
    expect(planReadmits('p', [], first.open, now).close).toEqual(['readmit:p:d']);
    // an ask opened by hand or seeded (another id, same title) is respected and never closed by the poller
    const seeded = { ...first.open[0]!, id: 'n4' };
    expect(planReadmits('p', q, [seeded], now)).toEqual({ open: [], close: [] });
    expect(planReadmits('p', [], [seeded], now).close).toEqual([]);
  });
});


