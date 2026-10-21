// The pure parts of the review: tables and small cases.
import { describe, expect, it } from 'vitest';
import { claudeArgs } from '../../agent/spawn';
import { FIXTURE, TEST_FILE, beyondMechanical } from '../../lane/integrity';
import { capDiff, parseReview } from '../../lane/reviewPrompt';

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
