// Live mode against a real group (BELAY_MODE=live, BELAY_GITLAB glab) is the M1 hand-run's app
// (gitlab/components/README.md, "M1: report-only, writes by hand"): a missing or malformed variable there must stop the
// poller with the variable's name, never fall back to the default group or believe no hand-posted proof note.
import { describe, expect, it, vi } from 'vitest';
import { readPollerConfig } from '../config';
import { runPollCycle } from '../cycle';
import { NOW, rig } from './helpers';

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
