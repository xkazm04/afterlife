// One ledger-event contract for the writer (engine `ledger append`), the importer (server parseLedgerJsonl) and the
// shared parser they both delegate to: every row is accepted or refused by all three alike, and what the writer prints
// imports and verifies.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { capture } from '../../../engine/__tests__/helpers';
import { main } from '../../../engine/cli';
import { parseLedgerEvent } from '../../../engine/commands/ledger';
import type { Decision } from '../../../engine/decide/gate';
import { parseLedgerJsonl } from '../../server/ledger/parse';
import { append, verifyChain, type GateDecision } from '../ledger';
import { parseChainText, parseEventBody, parseStoredLine } from './parse';

// The gate's own decision union (engine/decide/gate.ts) and the one a `would` may state are the same four, both ways.
const DECISIONS_MATCH: [Decision, GateDecision] extends [GateDecision, Decision] ? true : never = true;
void DECISIONS_MATCH;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'belay-chain-'));
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }));

type Body = Parameters<typeof append>[1];
const base = {
  at: '2026-10-21T14:20:05Z', agent: 'ai-patcher-acme', action_class: 'code-fix.patch', kind: 'tier_decision', tier_at_time: 'supervised',
  subject: { project_id: 70123456, type: 'mr', iid: 44 }, payload_ref: 'proofs/01J9.json', observed_by: 'ci_job',
};
const ev = (o: Record<string, unknown> = {}, subject: Record<string, unknown> = {}) => ({ ...base, ...o, subject: { ...base.subject, ...subject } });

const VALID: [string, Record<string, unknown>][] = [
  ['a tier_decision with a would one rung up', ev({ would: { tier: 'hands_off', decision: 'merge' }, state_rev: 'c1'.repeat(20), withdrew: ['approval'] })],
  ['a guardrail_verdict that blocks', ev({ kind: 'guardrail_verdict', verdict: 'block' })],
  ['a deployed event with its environment', ev({ kind: 'deployed', environment: { name: 'production', tier: 'production' } }, { type: 'deployment', iid: 0 })],
];
const INVALID: [string, Record<string, unknown>][] = [
  ['an unknown kind', ev({ kind: 'bogus' })],
  ['an unknown observer', ev({ observed_by: 'email' })],
  ['an unknown subject type', ev({}, { type: 'commit' })],
  ['an unknown tier_at_time', ev({ tier_at_time: 'god' })],
  ['project_id 1.5', ev({}, { project_id: 1.5 })],
  ['project_id -1', ev({}, { project_id: -1 })],
  ['iid 2.5', ev({}, { iid: 2.5 })],
  ['an empty agent', ev({ agent: '' })],
  ['a bad at', ev({ at: 'yesterday' })],
  ['a verdict on a non-guardrail kind', ev({ verdict: 'pass' })],
  ['an environment on a non-deployed kind', ev({ kind: 'merged', environment: { name: 'p', tier: 'production' } })],
  ['a bad state_rev', ev({ state_rev: 'abc' })],
  ['a duplicate withdrew', ev({ withdrew: ['approval', 'approval'] })],
  ['a would at hands_off', ev({ tier_at_time: 'hands_off', would: { tier: 'hands_off', decision: 'merge' } })],
];

const accepts = (f: () => unknown): boolean => {
  try {
    f();
    return true;
  } catch {
    return false;
  }
};
const verdicts = (raw: Record<string, unknown>) => [
  parseEventBody(raw).ok,
  accepts(() => parseLedgerEvent(raw)),
  accepts(() => parseLedgerJsonl(JSON.stringify(append([], raw as unknown as Body)))),
];

describe('the ledger-event contract: writer, importer and shared parser agree on every row', () => {
  it.each(VALID)('accepts %s at all three', (_, raw) => expect(verdicts(raw)).toEqual([true, true, true]));
  it.each(INVALID)('refuses %s at all three', (_, raw) => expect(verdicts(raw)).toEqual([false, false, false]));

  it('names the field it refuses', () => {
    expect(parseEventBody(ev({}, { project_id: 1.5 }))).toMatchObject({ ok: false, reason: expect.stringMatching(/subject\.project_id/) });
    expect(parseEventBody(null)).toMatchObject({ ok: false });
  });
});

describe('writer -> importer round trip', () => {
  it('every line the engine appends for the valid rows imports and verifies', () => {
    const chain = path.join(tmp, 'events.jsonl');
    const printed = VALID.map(([, raw], i) => {
      const e = path.join(tmp, `event${i}.json`);
      fs.writeFileSync(e, JSON.stringify(raw));
      const c = capture();
      expect(main(['ledger', 'append', '--event', e, '--chain', chain, '--write'], c.io)).toBe(0);
      return c.out().trim();
    });
    const events = parseLedgerJsonl(printed.join('\n'));
    expect(events.map((e) => e.seq)).toEqual([1, 2, 3]);
    expect(verifyChain(events)).toBeNull();
    expect(parseLedgerJsonl(fs.readFileSync(chain, 'utf8'))).toEqual(events);
  });
});

describe('parseStoredLine and parseChainText', () => {
  const line = append([], ev() as unknown as Body);

  it('a stored line needs a positive seq and sha256 hex links', () => {
    expect(parseStoredLine(line)).toMatchObject({ ok: true, event: line });
    for (const bad of [{ ...line, seq: 0 }, { ...line, hash: 'abc' }, { ...line, prev_hash: line.prev_hash.slice(1) }]) expect(parseStoredLine(bad).ok).toBe(false);
  });

  it('skips blank lines and CRLF, and names the first bad line by its number in the file', () => {
    const text = `${JSON.stringify(line)}\r\n\r\n`;
    expect(parseChainText(text)).toMatchObject({ ok: true, events: [line] });
    expect(parseChainText(`${text}{ nope\n`)).toEqual({ ok: false, line: 3, reason: 'not valid JSON' });
    expect(parseChainText(`${text}${JSON.stringify({ ...line, kind: 'bogus' })}\n`)).toMatchObject({ ok: false, line: 3 });
  });

  it("a caller's own rule judges each line's one parse: the first bad line wins, and on one line the shared reason does", () => {
    const seen: unknown[] = [];
    const own = (json: unknown) => (seen.push(json), 'extra' in (json as object) ? 'own refusal' : null);
    const good = JSON.stringify(line);
    const extra = JSON.stringify({ ...line, extra: 1 });
    const bogus = JSON.stringify({ ...line, kind: 'bogus' });
    expect(parseChainText(`${good}\n\n${good}\n`, own)).toMatchObject({ ok: true, events: [line, line] });
    expect(seen).toHaveLength(2);
    expect(parseChainText(`${good}\n${extra}\n${bogus}\n`, own)).toEqual({ ok: false, line: 2, reason: 'own refusal' });
    expect(parseChainText(`${bogus}\n${extra}\n`, own)).toMatchObject({ ok: false, line: 1, reason: expect.stringMatching(/^kind/) });
    expect(parseChainText(JSON.stringify({ ...line, kind: 'bogus', extra: 1 }), own)).toMatchObject({ line: 1, reason: expect.stringMatching(/^kind/) });
    expect(() => parseLedgerJsonl(`${good}\n${JSON.stringify({ ...line, quorum: 1 })}\n${bogus}`)).toThrow(/line 2.*quorum/);
  });
});
