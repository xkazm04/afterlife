// Live mode against a real group (BELAY_MODE=live, BELAY_GITLAB glab) is the M1 hand-run's app
// (gitlab/components/README.md, "M1: report-only, writes by hand"): a missing or malformed variable there must stop the
// poller with the variable's name, never fall back to the default group or believe no hand-posted proof note.
import { describe, expect, it, vi } from 'vitest';
import { proofNote } from '@/server/gitlab/fake/demo/notes';
import { allows, readPollerConfig } from '../config';
import { runPollCycle } from '../cycle';
import { deriveTask } from '../derive/task';
import { NOW, rig } from './helpers';
import { goodProof, mr, note, SHA } from './proofs';

const LIVE = { BELAY_MODE: 'live', BELAY_GROUP_ID: '987654', BELAY_PROJECT: 'ledgerline', BELAY_PROOF_AUTHORS: 'op-hand' };

describe('readPollerConfig in live mode', () => {
  it('reads a complete live environment, the operator among the proof authors', () => {
    const cfg = readPollerConfig('987654', LIVE);
    expect(cfg.proof.names).toEqual(['op-hand']);
    expect(readPollerConfig('acme/team', { ...LIVE, BELAY_GROUP_ID: 'acme/team', BELAY_PROOF_AUTHORS: 'op-hand, op.two' }).proof.names).toEqual(['op-hand', 'op.two']);
  });

  for (const name of ['BELAY_GROUP_ID', 'BELAY_PROJECT', 'BELAY_PROOF_AUTHORS'] as const) {
    it(`throws naming ${name} when it is missing or blank`, () => {
      expect(() => readPollerConfig('987654', { ...LIVE, [name]: undefined })).toThrow(new RegExp(`${name} is not set`));
      expect(() => readPollerConfig('987654', { ...LIVE, [name]: ' , ' })).toThrow(new RegExp(name));
    });
  }

  it('throws naming each malformed variable', () => {
    expect(() => readPollerConfig('987654', { ...LIVE, BELAY_GROUP_ID: 'https://gitlab.com/acme' })).toThrow(/BELAY_GROUP_ID is not a group id or path/);
    expect(() => readPollerConfig('987654', { ...LIVE, BELAY_PROJECT: 'acme/ledgerline' })).toThrow(/BELAY_PROJECT is not a project path/);
    expect(() => readPollerConfig('987654', { ...LIVE, BELAY_PROOF_AUTHORS: '@op-hand' })).toThrow(/BELAY_PROOF_AUTHORS is not a comma-separated list of usernames/);
    // optional, but a list nobody's username can match is refused as the proof authors are, not believed of no one
    expect(() => readPollerConfig('987654', { ...LIVE, BELAY_GUARDRAIL_AUTHORS: 'guard-one guard-two' })).toThrow(/BELAY_GUARDRAIL_AUTHORS is not a comma-separated list of usernames/);
    expect(readPollerConfig('987654', { ...LIVE, BELAY_GUARDRAIL_AUTHORS: 'guard-one, guard.two' }).guardrail.names).toEqual(['guard-one', 'guard.two']);
  });

  it('refuses a set agent prefix or Belay project name no username or path can match, and reads one padded with spaces', () => {
    // a prefix with a space admits no agent (no task is ever read); a project name with a slash is never <group>/<name>
    expect(() => readPollerConfig('987654', { ...LIVE, BELAY_AGENT_PREFIX: 'ai bot-' })).toThrow(/BELAY_AGENT_PREFIX is not a username prefix/);
    expect(() => readPollerConfig('987654', { ...LIVE, BELAY_POLICY_PROJECT: 'acme/belay-policy' })).toThrow(/BELAY_POLICY_PROJECT is not a project path/);
    expect(() => readPollerConfig('987654', { ...LIVE, BELAY_LEDGER_PROJECT: 'belay ledger' })).toThrow(/BELAY_LEDGER_PROJECT is not a project path/);
    const cfg = readPollerConfig('987654', { ...LIVE, BELAY_AGENT_PREFIX: ' op-bot- ', BELAY_POLICY_PROJECT: 'op-policy ', BELAY_LEDGER_PROJECT: ' op-ledger' });
    expect([cfg.agents.prefixes, cfg.policyProject, cfg.ledgerProject]).toEqual([['op-bot-'], 'op-policy', 'op-ledger']);
  });

  it('on a real group believes only the named proof and guardrail accounts, unless BELAY_TRUST_PREFIXES=1', () => {
    // anyone can register ai-proof-stranger: a forged proof or block from it must not move a task
    const cfg = readPollerConfig('987654', { ...LIVE, BELAY_GUARDRAIL_AUTHORS: 'guard-one' });
    expect([allows(cfg.proof, 'ai-proof-stranger'), allows(cfg.guardrail, 'ai-guardrail-stranger')]).toEqual([false, false]);
    expect([allows(cfg.proof, 'op-hand'), allows(cfg.guardrail, 'guard-one')]).toEqual([true, true]);
    const d = deriveTask({ mr: mr(), notes: [note('ai-proof-stranger', proofNote(goodProof(SHA)))], deployments: [] }, 'ledgerline', cfg, () => 1);
    expect([d?.proof, d?.task.stateLabel]).toEqual([null, 'waiting for proof']);
    const opted = readPollerConfig('987654', { ...LIVE, BELAY_TRUST_PREFIXES: '1' });
    expect([allows(opted.proof, 'ai-proof-x'), allows(opted.guardrail, 'ai-guardrail-x')]).toEqual([true, true]);
    // the demo and the seeded fake group keep the prefixes their accounts are named by
    expect(allows(readPollerConfig(144060371, { BELAY_MODE: 'live', BELAY_GITLAB: 'fake' }).proof, 'ai-proof-acme-lab')).toBe(true);
    expect(allows(readPollerConfig(144060371, {}).guardrail, 'ai-guardrail-acme-lab')).toBe(true);
  });

  it('names every problem at once', () => {
    expect(() => readPollerConfig('144060371', { BELAY_MODE: 'live' })).toThrow(/BELAY_GROUP_ID.*BELAY_PROJECT.*BELAY_PROOF_AUTHORS/s);
  });

  it('asks nothing of demo mode or of live mode on the seeded fake group', () => {
    expect(readPollerConfig(144060371, {}).proof.names).toEqual([]);
    expect(readPollerConfig(144060371, { BELAY_MODE: 'replay' }).proof.names).toEqual([]);
    expect(readPollerConfig(144060371, { BELAY_MODE: 'live', BELAY_GITLAB: 'fake' }).proof.names).toEqual([]);
  });
});

describe('runPollCycle with the environment as its config', () => {
  it('in live mode with no BELAY_GROUP_ID, rejects naming it and reads nothing from GitLab (no default group)', async () => {
    const r = await rig();
    const reads: string[] = [];
    const port = new Proxy(r.gl.port, { get: (t, k, rc) => (reads.push(String(k)), Reflect.get(t, k, rc)) });
    vi.stubEnv('BELAY_MODE', 'live');
    vi.stubEnv('BELAY_GITLAB', 'glab');
    vi.stubEnv('BELAY_GROUP_ID', '');
    vi.stubEnv('BELAY_PROJECT', 'ledgerline');
    vi.stubEnv('BELAY_PROOF_AUTHORS', 'op-hand');
    try {
      await expect(runPollCycle(port, r.db, NOW)).rejects.toThrow(/BELAY_GROUP_ID is not set/);
    } finally {
      vi.unstubAllEnvs();
    }
    expect(reads).toEqual([]);
  });
});
