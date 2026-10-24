// `ledger append` reads the stored chain as the importer does (src/schemas/chain/strict.ts on top of the shared parser):
// a hash-valid chain the importer refuses, by an unknown key or a zone-less `at`, is never extended by the CLI either.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { append, hashEvent, type LedgerEvent } from '../../src/schemas/ledger';
import { parseLedgerJsonl } from '../../src/server/ledger/parse';
import { parseLedgerEvent } from '../commands/ledger';
import { main } from '../cli';
import { capture } from './helpers';

const event = {
  at: '2026-10-21T14:20:05Z', agent: 'ai-patcher-acme', action_class: 'code-fix.patch', kind: 'guardrail_verdict', tier_at_time: 'supervised',
  subject: { project_id: 70123456, type: 'mr', iid: 44 }, payload_ref: 'https://gitlab.example/acme/ledgerline/-/merge_requests/44', observed_by: 'ci_job', verdict: 'pass',
};

/** A line rehashed after the edit, so the chain still verifies and only the stricter rules can refuse it. */
const rehash = (e: Record<string, unknown>): LedgerEvent => {
  const body = { ...e };
  delete body.hash;
  return { ...body, hash: hashEvent(body as Omit<LedgerEvent, 'hash'>) } as LedgerEvent;
};

describe('ledger append refuses to extend a chain the importer refuses', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'belay-strict-'));
  afterAll(() => fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }));
  const one = append([], parseLedgerEvent(event));
  const cases: Array<[string, LedgerEvent, RegExp]> = [
    ['an unknown key', { ...one, quorum: 1 } as LedgerEvent, /unknown key "quorum"/],
    ['a zone-less at', rehash({ ...one, at: '2026-10-21T14:20:05' }), /at must be an ISO time with a zone/],
  ];
  for (const [what, line, reason] of cases) {
    it(`a stored line with ${what}`, () => {
      const text = `${JSON.stringify(line)}\n`;
      expect(() => parseLedgerJsonl(text)).toThrow(reason); // the importer's refusal, the ground truth
      const chain = path.join(tmp, `${what.replaceAll(' ', '-')}.jsonl`);
      const e = path.join(tmp, 'event.json');
      fs.writeFileSync(chain, text);
      fs.writeFileSync(e, JSON.stringify(event));
      const c = capture();
      const code = main(['ledger', 'append', '--event', e, '--chain', chain, '--write'], c.io);
      expect(code).toBe(2);
      expect((c.json() as { error: string }).error).toMatch(new RegExp(`^chain line 1: .*${reason.source}`));
      expect(fs.readFileSync(chain, 'utf8')).toBe(text);
    });
  }
});
