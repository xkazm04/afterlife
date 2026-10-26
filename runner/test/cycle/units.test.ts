// The pure parts of the review, the trailer, the frontier config and T3: tables and small cases.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { claudeArgs } from '../../agent/spawn';
import { parseFrontier } from '../../fleet/frontier';
import { ARMED_PATH, coAuthorTrailer, commitBody } from '../../lane/land';
import { FIXTURE, TEST_FILE, beyondMechanical } from '../../lane/integrity';
import { capDiff, parseReview } from '../../lane/reviewPrompt';
import { afterRuns, parseTech, summarise, techDelta } from '../../tech/parse';
import type { TechMetric } from '../../index';

const diff = (removed: string[], added: string[]) => ['--- a/x.test.ts', '+++ b/x.test.ts', '@@ -1 +1 @@', ...removed.map((l) => `-${l}`), ...added.map((l) => `+${l}`)].join('\n');

describe('beyondMechanical: what lane.md allows in an existing test', () => {
  it.each([
    ['a renamed call with its expected value kept', ['  expect(sum(1, 2)).toBe(3);'], ['  expect(add(1, 2)).toBe(3);'], null],
    ['a new argument at a call site', ['  assert_eq!(parse("a"), Ok(1));'], ['  assert_eq!(parse("a", &cfg), Ok(1));'], null],
    ['an import swapped', ["import { sum } from './sum';"], ["import { add } from './add';"], null],
    ['one appended registry line', [], ["  { file: 'new.test.ts', match: 'guards x' },"], null],
    ['a removed assertion', ['  expect(a).toBe(1);'], [], 'removes or rewrites'],
    ['a changed expected value', ['  expect(f()).toBe(3);'], ['  expect(f()).toBe(4);'], 'changes an expected value'],
    ['a rewritten assertion (node:assert)', ['assert.equal(add(1, 2), 3);'], ['assert.ok(add(1, 2));'], 'removes or rewrites'],
    ['a new case in the existing file', [], ["it('does y', () => { expect(y()).toBe(true); });"], 'adds assertions'],
  ])('%s', (_n, removed, added, want) => {
    const why = beyondMechanical(diff(removed, added));
    if (want === null) expect(why).toBeNull();
    else expect(why).toContain(want);
  });
  it('knows test files and fixtures by the usual conventions', () => {
    for (const p of ['src/a.test.ts', 'web/b.spec.tsx', 'tests/test_x.py', 'pkg/x_test.go', 'crates/a/src/x_tests.rs', 'e2e/flow.ts']) expect(TEST_FILE.test(p)).toBe(true);
    for (const p of ['src/a.ts', 'src/testing.ts', 'docs/tests.md']) expect(TEST_FILE.test(p)).toBe(false);
    expect(FIXTURE.test('src/__fixtures__/a.json')).toBe(true);
  });
});

describe('the review contract', () => {
  it('reads the last json block: [] is OK, findings are capped and cleaned, no block is unread', () => {
    expect(parseReview('fine\n```json\n{"v":1,"findings":[]}\n```')).toEqual([]);
    const two = parseReview('```json\n{"findings":[]}\n```\nthen\n```json\n{"v":1,"findings":[{"file":"a.ts","line":3,"check":"compile","problem":"x","evidence":"b.d.ts:1"},{"file":"","problem":"no file"}]}\n```');
    expect(two).toEqual([{ file: 'a.ts', line: 3, check: 'compile', problem: 'x', evidence: 'b.d.ts:1' }]);
    const many = Array.from({ length: 12 }, (_, i) => ({ file: `f${i}`, problem: 'p' }));
    expect(parseReview(`\`\`\`json\n${JSON.stringify({ findings: many })}\n\`\`\``)).toHaveLength(8);
    expect(parseReview('OK, nothing to report')).toBeNull();
    expect(parseReview('```json\n{not json}\n```')).toBeNull();
  });
  it('caps the diff it shows the reviewer', () => {
    expect(capDiff('x'.repeat(50), 10)).toMatch(/^x{10}\n\.\.\. \(diff cut short at 10 characters/);
    expect(capDiff('short')).toBe('short');
  });
  it('resumes a session only by a plain id', () => {
    const args = claudeArgs('sonnet', { step: 'lane', bash: [] }, 'C:\\tmp\\s.json', '894b4269-fc4e-4b1b-ac36-e5a1fe9c0462');
    expect(args.slice(-2)).toEqual(['--resume', '894b4269-fc4e-4b1b-ac36-e5a1fe9c0462']);
    expect(() => claudeArgs('sonnet', { step: 'lane', bash: [] }, 'C:\\tmp\\s.json', 'x & calc')).toThrow(/session id/);
    expect(claudeArgs('sonnet', { step: 'review' }, 'C:\\tmp\\s.json')).toContain('--tools=Read,Grep,Glob');
  });
});

describe('agent and hook config a lane may never land', () => {
  it.each(['.claude/settings.json', '.Claude/settings.json', '.CLAUDE/hooks/x.sh', '.mcp.json', '.MCP.json', '.husky/pre-commit', '.Husky/pre-commit', '.githooks/x'])('refuses %s', (p) => {
    expect(ARMED_PATH.test(p)).toBe(true);
  });
  it.each(['src/.claude.ts', 'docs/.claude/x.md', 'mcp.json', 'husky.md'])('lets %s through', (p) => {
    expect(ARMED_PATH.test(p)).toBe(false);
  });
});

describe('the co-author trailer', () => {
  it('names the model the lane reported, last in the body, and nothing for an odd id', () => {
    expect(coAuthorTrailer('claude-sonnet-5-5')).toBe('Co-Authored-By: Claude (claude-sonnet-5-5) <noreply@anthropic.com>');
    for (const odd of [null, undefined, '', 'a b', 'x>y']) expect(coAuthorTrailer(odd)).toBeNull();
    const body = commitBody({ lane: 'a', title: 'T', files: [], why: 'w:1', challenge: '' }, 'did it', 'claude-sonnet-5-5');
    expect(body.split('\n\n')).toEqual(['Why: w:1', 'Done: did it', 'Lane: a', 'Co-Authored-By: Claude (claude-sonnet-5-5) <noreply@anthropic.com>']);
  });
});

const metric = (over: Partial<TechMetric> = {}): TechMetric => ({ name: 'm', command: 'x', parse: { kind: 'wall' }, direction: 'down', threshold: 0.1, ...over });
const fleetWith = (frontier: unknown) => parseFrontier(frontier, 'fleet.yml: repos[0]');

describe('fleet frontier', () => {
  it('accepts the SKILL shape with every parse kind', () => {
    const f = fleetWith({ objective: 'Faster tests', metrics: [{ name: 'unit wall', command: 'npm test', parse: { kind: 'wall', unit: 's' }, direction: 'down', threshold: 0.15, timeoutMin: 10 }, { name: 'bundle', command: null, parse: { kind: 'json-sum', file: '.next/stats.json', field: 'size', scale: 0.001, unit: 'kB' }, direction: 'down', threshold: 0.05 }, { name: 'tests', command: 'npm test', parse: { kind: 'regex', pattern: 'Tests\\s+(\\d+) passed', unit: 'tests' }, direction: 'up', threshold: 0.1 }] });
    expect(f?.metrics.map((m) => m.parse.kind)).toEqual(['wall', 'json-sum', 'regex']);
    expect(fleetWith(undefined)).toBeUndefined();
  });
  it("the example's commented frontier block is valid once uncommented", () => {
    const text = fs.readFileSync(path.resolve(import.meta.dirname, '../../fleet.example.yml'), 'utf8');
    const block = text.split(/\r?\n/).filter((l) => l.startsWith('#   ')).map((l) => l.slice(4)).join('\n');
    const f = fleetWith((parse(block) as { frontier: unknown }).frontier);
    expect(f?.metrics.map((m) => [m.name, m.parse.kind])).toEqual([['build', 'wall'], ['first-load js', 'json-sum'], ['unit tests', 'regex']]);
  });
  it.each([
    ['an unknown key', { objective: 'o', metrics: [metric()], extra: 1 }],
    ['no metrics', { objective: 'o', metrics: [] }],
    ['an unknown parse kind', { objective: 'o', metrics: [metric({ parse: { kind: 'lines' } as never })] }],
    ['a regex without a capture group', { objective: 'o', metrics: [metric({ parse: { kind: 'regex', pattern: 'passed' } })] }],
    ['a regex that does not compile', { objective: 'o', metrics: [metric({ parse: { kind: 'regex', pattern: '(' } })] }],
    ['a json file outside the repo', { objective: 'o', metrics: [metric({ parse: { kind: 'json-sum', file: '../x.json', field: 'a' } })] }],
    ['a bad direction', { objective: 'o', metrics: [metric({ direction: 'sideways' as never })] }],
    ['a zero threshold', { objective: 'o', metrics: [metric({ threshold: 0 })] }],
    ['a first metric with no command', { objective: 'o', metrics: [metric({ command: null, parse: { kind: 'regex', pattern: '(\\d+)' } })] }],
    ['duplicate names', { objective: 'o', metrics: [metric(), metric()] }],
  ])('rejects %s', (_n, v) => {
    expect(() => fleetWith(v)).toThrow(/fleet\.yml: repos\[0\]: frontier/);
  });
});

describe('T3 parse kinds and the delta', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'afterlife-tech-'));
  fs.writeFileSync(path.join(cwd, 'stats.json'), JSON.stringify({ a: { bytes: 10 }, b: { bytes: 32 }, c: {} }));
  const run = { output: 'Tests  41 passed\n', wallS: 2.5, cwd };
  it('reads wall time, a json sum and a regex capture', () => {
    expect(parseTech(metric(), run)).toBe(2.5);
    expect(parseTech(metric({ parse: { kind: 'json-sum', file: 'stats.json', field: 'bytes', scale: 2 } }), run)).toBe(84);
    expect(parseTech(metric({ parse: { kind: 'json-sum', file: 'missing.json', field: 'bytes' } }), run)).toBeNull();
    expect(parseTech(metric({ parse: { kind: 'regex', pattern: 'Tests\\s+(\\d+) passed' } }), run)).toBe(41);
    expect(parseTech(metric({ parse: { kind: 'regex', pattern: 'Lint (\\d+)' } }), run)).toBeNull();
  });
  it('signs the gain by direction, flags a breakthrough, and calls a metric noisy by its spread', () => {
    const ms = [metric({ name: 'wall' }), metric({ name: 'tests', direction: 'up', parse: { kind: 'regex', pattern: '(\\d+)' } })];
    const before = [summarise('wall', [40, 50]), summarise('tests', [100, 100])];
    const after = [summarise('wall', [30, 30]), summarise('tests', [105, null])];
    expect(before[0]).toMatchObject({ mean: 45, spread: 0.22 });
    const d = techDelta(ms, before, after);
    expect(d[0]).toMatchObject({ name: 'wall', unit: 's', before: 45, after: 30, gain: 0.33, breakthrough: true, noisy: true });
    expect(d[1]).toMatchObject({ name: 'tests', before: 100, after: 105, gain: 0.05, breakthrough: false, noisy: false });
    const none = techDelta([ms[1]!], [summarise('tests', [null, null])], [summarise('tests', [7])])[0];
    expect(none).not.toHaveProperty('before');
    expect(none).not.toHaveProperty('gain');
  });
  it('measures the tip twice when a metric can vary, once when every base run agreed', () => {
    const det = metric({ parse: { kind: 'regex', pattern: '(\\d+)' } });
    expect(afterRuns([det], [summarise('m', [5, 5])])).toBe(1);
    expect(afterRuns([det], [summarise('m', [5, 6])])).toBe(2);
    expect(afterRuns([metric()], [summarise('m', [5, 5])])).toBe(2);
  });
});
