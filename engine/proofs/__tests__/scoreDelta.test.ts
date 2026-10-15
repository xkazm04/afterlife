import { describe, expect, it } from 'vitest';
import type { MaturityScan } from '../../../src/schemas/maturity';
import { checkOf, fixture, NOW, policy } from '../../__tests__/helpers';
import { prove } from '../index';

const env = { policy: policy(), now: NOW };
const input = fixture('score', 'input.pass.json');
const base = fixture('score', 'base.scan.json') as unknown as MaturityScan;
const run = (patch: Record<string, unknown> = {}) => prove('score-delta', { ...input, ...patch }, env);
/** The base scan with some stages' rungs replaced (a lit cell keeps, or gets, one cited object). */
const cited = (c: MaturityScan['cells'][number]) => (c.evidence.length ? c.evidence : [{ label: 'x', url: 'https://gitlab.example.com/x' }]);
const scan = (rungs: Record<string, number | null>, more: Partial<MaturityScan> = {}): MaturityScan => ({
  ...base,
  ...more,
  cells: base.cells.map((c) => (c.stage in rungs ? { ...c, rung: rungs[c.stage] ?? null, evidence: cited(c) } : c)),
});
const pair = (b: unknown, h: unknown) => run({ base: { scan: b }, head: { scan: h } });

describe('score-delta', () => {
  it('passes when no stage is lower at head, by the same engine, on the task project', () => {
    const b = run();
    expect(b.verdict).toBe('pass');
    expect(checkOf(b, 'no-stage-regressed')).toMatchObject({ ok: true, claim_id: 's1', detail: '9 stage(s), none lower at head (1 lifted)' });
    expect(b.evidence).toHaveLength(2);
    expect(pair(base, base).verdict).toBe('pass');
  });

  it('fails a stage that is lower at head, even when another lifts', () => {
    const b = prove('score-delta', fixture('score', 'input.regressed.json'), env);
    expect(checkOf(b, 'no-stage-regressed').detail).toBe('lower at head: package enforced to running');
    expect(b.verdict).toBe('fail');
    expect(pair(base, scan({ plan: 2, verify: 2 })).verdict).toBe('fail'); // verify R3 to R2
  });

  it('is inconclusive on scans by different engine versions, or of another project', () => {
    const b = prove('score-delta', fixture('score', 'input.mismatch.json'), env);
    expect([b.verdict, checkOf(b, 'same-engine').ok, checkOf(b, 'no-stage-regressed').ok]).toEqual(['inconclusive', null, null]);
    expect(checkOf(pair(base, scan({}, { project_id: 103 })), 'same-project').ok).toBeNull();
    expect(run({ task: { ...(input.task as object), project_id: 103 } }).verdict).toBe('inconclusive');
  });

  it('treats a stage unknown at both ends as unchanged, and one known at one end only as not comparable', () => {
    const dark = scan({ monitor: null });
    expect(checkOf(pair(dark, dark), 'no-stage-regressed').detail).toMatch(/1 unknown at both ends/);
    expect(pair(dark, dark).verdict).toBe('pass');
    expect(pair(base, scan({ verify: null })).verdict).toBe('inconclusive');
    expect(pair(scan({ verify: null }), base).verdict).toBe('inconclusive');
  });

  it('never passes on missing or malformed evidence: no scan, bad JSON, another schema, a cell out of order', () => {
    const cases = [
      pair(undefined, base),
      pair(base, '{ nope'),
      pair(base, { ...base, schema: 'belay.maturity/9' }),
      pair({ ...base, cells: [...base.cells].reverse() }, base),
      pair(base, { ...base, cells: base.cells.slice(1) }),
    ];
    for (const b of cases) expect(b.verdict).toBe('inconclusive');
    expect(checkOf(cases[0]!, 'no-stage-regressed').detail).toBe('base.scan is missing');
    expect(checkOf(cases[2]!, 'same-engine').detail).toMatch(/head\.scan: schema is "belay.maturity\/9"/);
    expect(pair(base, JSON.stringify(base)).verdict).toBe('pass'); // a $file arrives as text
  });
});
