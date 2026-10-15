// `ledger trial`: the audit a promotion MR asks for, in one command. It reads the belay-ledger file, cuts it at the seq the
// MR states, verifies it from genesis, anchors its head to the hash the MR states, and prints the holder's trial row with
// the same rule the ledger-record checker recomputes it by (no task block, no input.json).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { capture, fx } from '../../__tests__/helpers';
import { main } from '../../cli';

const HEAD11 = 'f3d3a9e5da945b0b357d23049a73999fb99db6b1a9ba12d24234d59cbc56db7b';
const HEAD5 = 'c1f70ebbb4ff1e32c22d00d1fa21a604b00bd267afd71184850b585394fff526';
const HOLDER = ['--agent', 'ai-qa-acme-lab', '--class', 'qa.file-bug', '--since', '2026-09-20T08:00:00Z'];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'belay-trial-'));
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

function cli(...argv: string[]) {
  const c = capture();
  const code = main(argv, c.io);
  return { code, json: c.json() as Record<string, unknown>, err: c.err() };
}
const trial = (...extra: string[]) => cli('ledger', 'trial', '--chain', fx('ledger', 'chain.jsonl'), ...HOLDER, ...extra);

describe('ledger trial: the chain alone, read as the MR states it', () => {
  it('verifies the chain and prints the holder\'s trial row', () => {
    const r = trial();
    expect(r.code).toBe(0);
    expect(r.json).toEqual({
      verifies: true,
      head: { seq: 11, hash: HEAD11 },
      trial: { n: 0, catches: 0, mrs: [{ iid: 201, seq: 3, resolution: 'no_edit_fact' }, { iid: 202, seq: 5, resolution: 'no_edit_fact' }, { iid: 203, seq: 7, resolution: 'open' }] },
    });
  });

  it('--through cuts the chain at the MR\'s seq: what came after does not change the row', () => {
    const r = trial('--through', '5');
    expect(r.code).toBe(0);
    expect(r.json.head).toEqual({ seq: 5, hash: HEAD5 });
    expect((r.json.trial as { mrs: unknown }).mrs).toEqual([{ iid: 201, seq: 3, resolution: 'no_edit_fact' }, { iid: 202, seq: 5, resolution: 'open' }]);
    const past = trial('--through', '99');
    expect(past.code).toBe(2);
    expect(past.err).toContain('the chain ends at seq 11');
  });

  it('--head anchors the file to the hash the MR names; any other chain is refused, naming both hashes', () => {
    expect(trial('--through', '11', '--head', HEAD11).code).toBe(0);
    const other = 'a'.repeat(64);
    const r = trial('--through', '11', '--head', other);
    expect(r.code).toBe(1);
    expect(r.json.trial).toBeUndefined();
    expect(String(r.json.reason)).toContain('seq 11');
    expect(String(r.json.reason)).toContain(HEAD11);
    expect(String(r.json.reason)).toContain(other);
  });

  it('a chain that does not verify states nothing: exit 1, the checker\'s words, no trial row', () => {
    const lines = fs.readFileSync(fx('ledger', 'chain.jsonl'), 'utf8').split('\n');
    lines[0] = JSON.stringify({ ...(JSON.parse(lines[0] ?? '{}') as object), agent: 'ai-someone-else' });
    const edited = path.join(tmp, 'edited.jsonl');
    fs.writeFileSync(edited, lines.join('\n'));
    const c = capture();
    const code = main(['ledger', 'trial', '--chain', edited, ...HOLDER], c.io);
    expect(code).toBe(1);
    const json = c.json() as Record<string, unknown>;
    expect(json.verifies).toBe(false);
    expect(json.trial).toBeUndefined();
    expect(String(json.reason)).toContain('the chain breaks at seq 1');
  });

  it('a holder with no trial MR on the chain: exit 0 and an empty row', () => {
    const r = cli('ledger', 'trial', '--chain', fx('ledger', 'chain.jsonl'), '--agent', 'ai-nobody', '--class', 'qa.file-bug', '--since', '2026-09-20T08:00:00Z');
    expect(r.code).toBe(0);
    expect(r.json.trial).toEqual({ n: 0, catches: 0, mrs: [] });
    expect(r.err).toContain('0 trial MR(s)');
  });

  it('agrees with prove --class ledger-record on the fixture record: same n, catches and seq range', () => {
    const row = trial().json.trial as { n: number; catches: number; mrs: { seq: number }[] };
    const p = cli('prove', '--class', 'ledger-record', '--input', fx('ledger', 'input.trial.json'));
    const check = (p.json.checks as { name: string; detail?: string; message?: string }[]).find((c) => c.name === 'trial-recomputed');
    const said = JSON.stringify(check);
    const seqs = row.mrs.map((m) => m.seq);
    expect(said).toContain(`next-rung trial ${row.n} of 15, ${row.catches} caught`);
    expect(said).toContain(`${row.mrs.length} trial MR(s) (tier_decision seq ${Math.min(...seqs)}-${Math.max(...seqs)})`);
    expect([Math.min(...seqs), Math.max(...seqs)]).toEqual([3, 7]);
  });

  it('stderr: a head line, then one line per trial MR', () => {
    const lines = trial().err.trimEnd().split('\n');
    expect(lines[0]).toBe('ledger trial ai-qa-acme-lab qa.file-bug: 3 trial MR(s), 0 resolved, 0 caught (chain verifies to seq 11)');
    expect(lines.slice(1)).toEqual(['  !201 seq 3 no_edit_fact', '  !202 seq 5 no_edit_fact', '  !203 seq 7 open']);
  });

  it('a short or bad input is exit 2, and ledger append is untouched', () => {
    expect(cli('ledger', 'trial', '--chain', fx('ledger', 'chain.jsonl'), '--agent', 'a', '--class', 'c').code).toBe(2);
    expect(trial('--since', 'yesterday').code).toBe(2);
    expect(trial('--through', '0').code).toBe(2);
    expect(trial('--head', 'abc').code).toBe(2);
    expect(cli('ledger', 'prepend').code).toBe(2);
  });
});
