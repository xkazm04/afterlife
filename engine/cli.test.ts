import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { verifyChain, type LedgerEvent } from '../src/schemas/ledger';
import type { ProofBlock } from '../src/schemas/proof';
import { capture, fx, ROOT } from './__tests__/helpers';
import { main } from './cli';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'belay-engine-'));
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

function cli(...argv: string[]) {
  const c = capture();
  const code = main(argv, c.io);
  return { code, json: c.json() as Record<string, unknown>, out: c.out(), err: c.err() };
}

const PROVE = (cls: string, ...rel: string[]) => ['prove', '--class', cls, '--input', fx(...rel)];

describe('exit codes: 0 pass, 1 fail, 2 inconclusive or error', () => {
  it('prove: 0 on pass, with the Proof Block on stdout and a summary on stderr', () => {
    const r = cli(...PROVE('exploit-test', 'exploit', 'input.pass.json'));
    expect(r.code).toBe(0);
    expect(r.json).toMatchObject({ schema: 'belay.proof/1', class: 'exploit-test', verdict: 'pass' });
    expect(r.err).toMatch(/^proof exploit-test: PASS/);
    expect(r.err).toMatch(/\[ok {3}\] base-red \(c1\)/);
    expect(r.out.endsWith('\n')).toBe(true);
  });

  it('prove: 1 on fail', () => {
    const r = cli(...PROVE('exploit-test', 'exploit', 'input.weakened.json'));
    expect(r.code).toBe(1);
    expect(r.json.verdict).toBe('fail');
    expect(r.err).toMatch(/\[FAIL {1}\] test-not-weakened/);
  });

  it('prove: 2 on inconclusive, including a class that is not implemented', () => {
    const r = cli(...PROVE('repro', 'rerun', 'flake.json'));
    expect(r.code).toBe(2);
    expect(r.json.verdict).toBe('inconclusive');
    expect(r.err).toMatch(/not implemented/);
    expect(cli(...PROVE('rerun-stats', 'rerun', 'real.json')).code).toBe(1);
    expect(cli(...PROVE('cited-diff', 'cited', 'input.grounded.json')).code).toBe(0);
    expect(cli(...PROVE('linked-evidence', 'linked', 'input.broken.json')).code).toBe(1);
  });

  it('2 with a JSON error for a bad class, a missing file, bad JSON, an unknown option or command', () => {
    const bad = path.join(tmp, 'bad.json');
    fs.writeFileSync(bad, '{ nope');
    const cases: string[][] = [
      ['prove', '--class', 'telepathy', '--input', 'x'],
      ['prove', '--class', 'rerun-stats', '--input', path.join(tmp, 'missing.json')],
      ['prove', '--class', 'rerun-stats', '--input', bad],
      ['prove', '--class', 'rerun-stats'],
      ['prove', '--class', 'rerun-stats', '--input', bad, '--bogus', '1'],
      ['frobnicate'],
      [],
    ];
    for (const argv of cases) {
      const r = cli(...argv);
      expect(r.code, argv.join(' ')).toBe(2);
      expect(typeof r.json.error, argv.join(' ')).toBe('string');
    }
  });

  it('resolves relative paths against the working directory it is given', () => {
    const c = capture(path.join(ROOT, 'engine', '__fixtures__', 'rerun'));
    expect(main(['prove', '--class', 'rerun-stats', '--input', 'flake.json', '--policy', '../../../policy/trust-policy.yml'], c.io)).toBe(0);
  });
});

describe('envelope', () => {
  const run = (...extra: string[]) => cli('envelope', '--policy', 'policy/trust-policy.yml', '--class', 'dep-bump.patch', '--diff', fx('exploit', 'fix.diff'), ...extra);
  it('0 inside the envelope, 1 outside it, listing the violations', () => {
    expect(run().code).toBe(0);
    expect(run('--env', 'review/mr-41', '--env', 'staging', '--env', 'production').code).toBe(0);
    const out = run('--env', 'eu-prod');
    expect(out.code).toBe(1);
    expect((out.json.violations as string[])[0]).toMatch(/eu-prod/);
    expect(out.err).toMatch(/OUTSIDE/);
  });
});

describe('gate, tripwire and ledger through the CLI', () => {
  const proofFile = path.join(tmp, 'proof.json');
  const handsOff = path.join(tmp, 'tier-state.yml');
  fs.writeFileSync(handsOff, fs.readFileSync(path.join(ROOT, 'policy', 'tier-state.yml'), 'utf8').replaceAll('tier: supervised', 'tier: hands_off'));
  const proof = cli(...PROVE('exploit-test', 'exploit', 'input.pass.json')).json as unknown as ProofBlock;
  fs.writeFileSync(proofFile, JSON.stringify(proof));
  const gate = (state: string, guardrail: string, ...extra: string[]) =>
    cli('gate', '--state', state, '--class', 'dep-bump.patch', '--proof', proofFile, '--guardrail', fx('events', guardrail), ...extra);

  it('gate: merge and approve exit 0, block exits 1, wait exits 2', () => {
    const merge = gate(handsOff, 'guardrail-pass.json');
    expect(merge.code).toBe(0);
    expect(merge.json).toMatchObject({ decision: 'merge', tier: 'hands_off' });
    expect(gate('policy/tier-state.yml', 'guardrail-pass.json').json).toMatchObject({ decision: 'approve' });
    expect(gate(handsOff, 'guardrail-block.json').code).toBe(1);
    const wait = cli('gate', '--state', handsOff, '--class', 'dep-bump.patch', '--proof', path.join(tmp, 'not-yet.json'), '--guardrail', fx('events', 'guardrail-pass.json'));
    expect(wait.code).toBe(2);
    expect(wait.json.decision).toBe('wait');
  });

  it('gate: measures the diff itself when given one, and takes a production target', () => {
    expect(gate(handsOff, 'guardrail-pass.json', '--diff', fx('exploit', 'fix.diff'), '--env', 'production').code).toBe(0);
    expect(gate(handsOff, 'guardrail-pass.json', '--diff', fx('exploit', 'fix.diff'), '--env', 'eu-prod').code).toBe(1);
  });

  it('gate: a file that is not a Proof Block is an error, not a decision', () => {
    fs.writeFileSync(path.join(tmp, 'nonsense.json'), '{"hello": 1}');
    expect(cli('gate', '--class', 'dep-bump.patch', '--proof', path.join(tmp, 'nonsense.json')).code).toBe(2);
  });

  it('tripwire: 0 with the demotion and the new tier-state.yml in the JSON', () => {
    const r = cli('tripwire', '--policy', 'policy/trust-policy.yml', '--state', 'policy/tier-state.yml', '--event', fx('events', 'guardrail-high.json'));
    expect(r.code).toBe(0);
    expect(r.json).toMatchObject({ demote: { from: 'supervised', to: 'quarantined', reason: 'guardrail_high' }, commit: { path: 'tier-state.yml' } });
    expect(r.err).toMatch(/DEMOTE/);
    expect(cli('tripwire', '--state', 'policy/tier-state.yml', '--event', path.join(tmp, 'nope.json')).code).toBe(2);
  });

  it('ledger append: a one-line hash-chained event, written on request, refusing a broken chain', () => {
    const chain = path.join(tmp, 'events.jsonl');
    const args = ['ledger', 'append', '--event', fx('events', 'ledger-event.json'), '--chain', chain];
    const first = cli(...args, '--write');
    expect(first.code).toBe(0);
    expect(first.out.trim().split('\n')).toHaveLength(1);
    expect(first.json).toMatchObject({ seq: 1, prev_hash: '0'.repeat(64) });
    const second = cli(...args, '--write');
    expect(second.json).toMatchObject({ seq: 2, prev_hash: first.json.hash });
    const lines = fs.readFileSync(chain, 'utf8').trim().split('\n').map((l) => JSON.parse(l) as LedgerEvent);
    expect(lines).toHaveLength(2);
    expect(verifyChain(lines)).toBeNull();
    const dry = cli(...args);
    expect(dry.json.seq).toBe(3);
    expect(fs.readFileSync(chain, 'utf8').trim().split('\n')).toHaveLength(2); // no --write, no change
    fs.writeFileSync(chain, `${lines.map((l, i) => JSON.stringify(i === 0 ? { ...l, agent: 'tampered' } : l)).join('\n')}\n`);
    const broken = cli(...args);
    expect(broken.code).toBe(2);
    expect(broken.json.error).toMatch(/broken at seq 1/);
  });

  it('ledger append: rejects an event with an unknown kind', () => {
    const e = path.join(tmp, 'event.json');
    fs.writeFileSync(e, JSON.stringify({ ...(JSON.parse(fs.readFileSync(fx('events', 'ledger-event.json'), 'utf8')) as object), kind: 'vibes' }));
    expect(cli('ledger', 'append', '--event', e, '--chain', path.join(tmp, 'c.jsonl')).code).toBe(2);
    expect(cli('ledger', 'prepend', '--event', e, '--chain', path.join(tmp, 'c.jsonl')).code).toBe(2);
  });
});
