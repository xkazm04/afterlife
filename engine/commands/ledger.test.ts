// parseLedgerEvent rebuilds an event field by field: a guardrail_verdict keeps the verdict the gate emitted (pass or block),
// any other kind or value is refused, and an event without one carries no verdict key at all, so it hashes as before.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { append, hashEvent, verifyChain, type LedgerKind } from '../../src/schemas/ledger';
import { EngineError } from '../core/types';
import { parseLedgerJsonl } from '../../src/server/ledger/parse';
import { capture } from '../__tests__/helpers';
import { main } from '../cli';
import { parseLedgerEvent, readChain } from './ledger';

const event = (o: Record<string, unknown> = {}) => ({
  at: '2026-10-21T14:20:05Z', agent: 'ai-patcher-acme', action_class: 'code-fix.patch', kind: 'guardrail_verdict', tier_at_time: 'supervised',
  subject: { project_id: 70123456, type: 'mr', iid: 44 }, payload_ref: 'https://gitlab.example/acme/ledgerline/-/merge_requests/44', observed_by: 'ci_job', ...o,
});

describe('parseLedgerEvent: the guardrail verdict', () => {
  it('keeps pass and block on a guardrail_verdict', () => {
    expect(parseLedgerEvent(event({ verdict: 'pass' })).verdict).toBe('pass');
    expect(parseLedgerEvent(event({ verdict: 'block' })).verdict).toBe('block');
  });

  it('refuses any other value, and a verdict on any other kind', () => {
    for (const verdict of ['fail', 'PASS', null, 1, '']) expect(() => parseLedgerEvent(event({ verdict }))).toThrow(EngineError);
    expect(() => parseLedgerEvent(event({ kind: 'tier_decision', verdict: 'pass' }))).toThrow(/verdict/);
  });

  it('leaves the key absent when the event states none: the hash is the one an event without the field always had', () => {
    const parsed = parseLedgerEvent(event({ kind: 'tier_decision' }));
    expect('verdict' in parsed).toBe(false);
    const line = append([], parsed);
    expect(line.hash).toBe(hashEvent({ ...event({ kind: 'tier_decision' }), seq: 1, prev_hash: '0'.repeat(64) } as Parameters<typeof hashEvent>[0]));
  });

  it('drops every field it does not know', () => {
    expect('extra' in parseLedgerEvent(event({ verdict: 'pass', extra: 'x' }))).toBe(false);
  });
});

describe('parseLedgerEvent: the environment of a deployed event', () => {
  const deployed = (o: Record<string, unknown> = {}) => event({ kind: 'deployed', ...o });

  it('keeps a name and a tier on a deployed event', () => {
    expect(parseLedgerEvent(deployed({ environment: { name: 'production', tier: 'production', extra: 1 } })).environment).toEqual({ name: 'production', tier: 'production' });
    for (const tier of ['staging', 'testing', 'development', 'other']) expect(parseLedgerEvent(deployed({ environment: { name: 'e', tier } })).environment?.tier).toBe(tier);
  });

  it('refuses it on any other kind, and a null, an unknown tier or a nameless one', () => {
    const env = { name: 'production', tier: 'production' };
    for (const kind of ['task_started', 'proof_verdict', 'guardrail_verdict', 'tier_decision', 'merged', 'outcome', 'clock_event']) {
      expect(() => parseLedgerEvent(event({ kind, environment: env }))).toThrow(/environment/);
    }
    for (const environment of [null, 'production', { name: 'p', tier: 'prod' }, { name: '', tier: 'other' }, { tier: 'other' }]) {
      expect(() => parseLedgerEvent(deployed({ environment }))).toThrow(EngineError);
    }
  });

  it('an event without one carries no environment key and hashes as before', () => {
    const parsed = parseLedgerEvent(deployed());
    expect('environment' in parsed).toBe(false);
    expect(append([], parsed).hash).toBe(append([], { ...parsed, environment: undefined } as typeof parsed).hash);
  });
});

describe('parseLedgerEvent: the tier-state.yml revision and the withdrawal of a tier_decision', () => {
  const decision = (o: Record<string, unknown> = {}) => event({ kind: 'tier_decision', ...o });
  const REV = 'c1'.repeat(20);

  it('keeps a 40-hex state_rev and a withdrew list on a tier_decision', () => {
    const parsed = parseLedgerEvent(decision({ state_rev: REV, withdrew: ['approval', 'auto_merge'] }));
    expect([parsed.state_rev, parsed.withdrew]).toEqual([REV, ['approval', 'auto_merge']]);
  });

  it('refuses them on any other kind, and a malformed value', () => {
    for (const kind of ['task_started', 'proof_verdict', 'guardrail_verdict', 'merged', 'deployed', 'outcome', 'clock_event']) {
      expect(() => parseLedgerEvent(event({ kind, state_rev: REV }))).toThrow(/state_rev/);
      expect(() => parseLedgerEvent(event({ kind, withdrew: ['approval'] }))).toThrow(/withdrew/);
    }
    for (const state_rev of ['c1', REV.toUpperCase(), null, 1]) expect(() => parseLedgerEvent(decision({ state_rev }))).toThrow(EngineError);
    for (const withdrew of [[], ['approval', 'approval'], ['merge'], 'approval', null]) expect(() => parseLedgerEvent(decision({ withdrew }))).toThrow(EngineError);
  });

  it('a decision without them carries neither key and hashes as before', () => {
    const parsed = parseLedgerEvent(decision());
    expect('state_rev' in parsed || 'withdrew' in parsed).toBe(false);
    expect(append([], parsed).hash).toBe(append([], { ...parsed, state_rev: undefined, withdrew: undefined } as typeof parsed).hash);
  });
});

describe('parseLedgerEvent: what the next rung would have decided, on a tier_decision', () => {
  const decision = (o: Record<string, unknown> = {}) => event({ kind: 'tier_decision', ...o });
  const WOULD = { tier: 'hands_off', decision: 'merge' };

  it('keeps a would naming the rung above tier_at_time and a decision', () => {
    expect(parseLedgerEvent(decision({ would: WOULD })).would).toEqual(WOULD);
    expect(parseLedgerEvent(decision({ tier_at_time: 'assisted', would: { tier: 'supervised', decision: 'approve' } })).would).toEqual({ tier: 'supervised', decision: 'approve' });
  });

  it('refuses it on any other kind, and a malformed value', () => {
    for (const kind of ['task_started', 'proof_verdict', 'guardrail_verdict', 'merged', 'deployed', 'outcome', 'clock_event']) {
      expect(() => parseLedgerEvent(event({ kind, would: WOULD }))).toThrow(/would/);
    }
    const bad = [{ tier: 'supervised', decision: 'merge' }, { tier: 'hands_off', decision: 'ship' }, { ...WOULD, extra: 1 }, null, 'merge', []];
    for (const would of bad) expect(() => parseLedgerEvent(decision({ would }))).toThrow(EngineError);
    expect(() => parseLedgerEvent(decision({ tier_at_time: 'hands_off', would: WOULD }))).toThrow(/would/); // no rung above
  });

  it('a decision without it carries no key and hashes as before', () => {
    const parsed = parseLedgerEvent(decision());
    expect('would' in parsed).toBe(false);
    expect(append([], parsed).hash).toBe(append([], { ...parsed, would: undefined } as typeof parsed).hash);
  });
});

describe('ledger append through the CLI: the shared parser guards the writer', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'belay-ledger-'));
  afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const cli = (raw: unknown, chain: string) => {
    const e = path.join(tmp, 'event.json');
    fs.writeFileSync(e, JSON.stringify(raw));
    const c = capture();
    const code = main(['ledger', 'append', '--event', e, '--chain', chain, '--write'], c.io);
    return { code, json: c.json() as Record<string, unknown> };
  };

  it('a --chain that is a directory is a read error naming EISDIR, as every other read is', () => {
    expect(cli(event(), tmp).json.error).toBe(`cannot read ${tmp} (EISDIR)`);
  });

  it('refuses a project_id that is not an integer >= 0, naming it', () => {
    for (const project_id of [1.5, -1]) {
      const r = cli(event({ subject: { project_id, type: 'mr', iid: 44 } }), path.join(tmp, `p${project_id}.jsonl`));
      expect(r.code).toBe(2);
      expect(r.json.error).toMatch(/subject\.project_id/);
    }
  });

  it('never extends a hash-valid chain whose stored line 2 is not a ledger event', () => {
    const one = append([], parseLedgerEvent(event()));
    const bogus = append([one], { ...parseLedgerEvent(event()), kind: 'bogus' as LedgerKind });
    const chain = path.join(tmp, 'bogus.jsonl');
    const text = `${JSON.stringify(one)}\n${JSON.stringify(bogus)}\n`;
    fs.writeFileSync(chain, text);
    const r = cli(event(), chain);
    expect(r.code).toBe(2);
    expect(r.json.error).toMatch(/^chain line 2: /);
    expect(fs.readFileSync(chain, 'utf8')).toBe(text);
  });
});

describe('parseLedgerEvent: only lines the reader accepts are written', () => {
  it('a line it writes parses with the server reader (parseLedgerJsonl), and the ids are non-negative integers like its own', () => {
    const line = append([], parseLedgerEvent(event()));
    expect(parseLedgerJsonl(`${JSON.stringify(line)}\n`)).toEqual([line]);
    for (const subject of [{ project_id: 1.5, iid: 44 }, { project_id: 7, iid: -1 }, { project_id: 7, iid: 0.5 }, { project_id: Number.MAX_VALUE, iid: 1.5 }]) {
      expect(() => parseLedgerEvent(event({ subject: { ...subject, type: 'mr' } })), JSON.stringify(subject)).toThrow(/non-negative integer/);
    }
  });
});

describe('ledger append --write', () => {
  it('starts a new line when the chain file does not end in a newline, so the chain still verifies and reads back', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'belay-ledger-'));
    try {
      const chain = path.join(dir, 'events.jsonl');
      const ev = path.join(dir, 'event.json');
      fs.writeFileSync(ev, JSON.stringify(event()));
      const run = () => main(['ledger', 'append', '--event', ev, '--chain', chain, '--write'], capture(dir).io);
      expect(run()).toBe(0);
      fs.writeFileSync(chain, fs.readFileSync(chain, 'utf8').trimEnd()); // as a chain fetched from the API may arrive
      expect(run()).toBe(0);
      const lines = readChain(fs.readFileSync(chain, 'utf8'));
      expect(lines.map((l) => l.seq)).toEqual([1, 2]);
      expect(verifyChain(lines)).toBeNull();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('parseLedgerEvent: at', () => {
  it('is an ISO instant with a zone: "10", "3/4/2026" and a zone-less time (read in the machine zone) are refused', () => {
    expect(parseLedgerEvent(event({ at: '2026-10-21T16:20:05+02:00' })).at).toBe('2026-10-21T16:20:05+02:00');
    for (const at of ['10', '3/4/2026', 'Oct 5 2026', '2026-10-05T10:00:00', '2026-10-05']) expect(() => parseLedgerEvent(event({ at })), at).toThrow(/event\.at must be an ISO time/);
  });
});
