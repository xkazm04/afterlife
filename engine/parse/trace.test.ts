import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fx } from '../__tests__/helpers';
import { cleanTrace, parseTrace } from './trace';

const status = (raw: string): [string, string][] => parseTrace(raw).map((c) => [c.name, c.status]);

describe('parseTrace', () => {
  it('reads Gradle output from a GitLab job log, with failure text', () => {
    const cases = parseTrace(fs.readFileSync(fx('exploit', 'base.trace.txt'), 'utf8'));
    expect(cases.map((c) => [c.name, c.status])).toEqual([
      ['rejectsDotDotSegments', 'failed'],
      ['rejectsSiblingStatementPrefix', 'failed'],
      ['servesNormalStatementFile', 'passed'],
    ]);
    expect(cases[0]?.output).toContain('../../../etc/passwd');
    expect(cases[0]?.output).not.toContain('Sibling');
    expect(cases[2]?.output).toBe('');
  });

  it('strips ANSI colours, carriage returns and GitLab section markers', () => {
    const raw = 'section_start:1760000000:test\r\x1b[0K\x1b[31mX > a() FAILED\x1b[0m\r\n    boom\n\nsection_end:1760000001:test\r\x1b[0K\n';
    expect(cleanTrace(raw).join('\n')).not.toMatch(/section_|\x1b/);
    expect(status(raw)).toEqual([['a', 'failed']]);
  });

  it('reads Maven Surefire failures', () => {
    const raw = [
      '[ERROR] Tests run: 2, Failures: 1, Errors: 0, Skipped: 0, Time elapsed: 0.05 s <<< FAILURE! - in com.x.PathTest',
      '[ERROR] com.x.PathTest.rejectsTraversal  Time elapsed: 0.01 s  <<< FAILURE!',
      'java.lang.AssertionError: served ../../etc/shadow',
      '',
      '[ERROR] Failures:',
      '[ERROR]   PathTest.rejectsTraversal:42 served ../../etc/shadow',
    ].join('\n');
    const cases = parseTrace(raw);
    expect(cases.filter((c) => c.status === 'failed').map((c) => c.name)).toContain('rejectsTraversal');
    expect(cases[0]?.classname).toBe('com.x.PathTest');
    expect(cases[0]?.output).toContain('etc/shadow');
  });

  it('reads pytest, go test and Jest/Vitest verbose output', () => {
    expect(status('tests/test_x.py::test_ok PASSED [50%]\ntests/test_x.py::test_bad FAILED [100%]')).toEqual([['test_ok', 'passed'], ['test_bad', 'failed']]);
    expect(status('=== RUN   TestA\n--- PASS: TestA (0.00s)\n--- FAIL: TestB (0.01s)\n    b_test.go:9: want 1 got 2\nFAIL')).toEqual([['TestA', 'passed'], ['TestB', 'failed']]);
    const js = parseTrace(' ✓ keeps the root (3 ms)\n ✕ escapes the root (5 ms)\n   expected rejection\n');
    expect(js.map((c) => [c.name, c.status])).toEqual([['keeps the root', 'passed'], ['escapes the root', 'failed']]);
    expect(js[1]?.output).toContain('expected rejection');
  });

  it('finds nothing in a log without tests', () => {
    expect(parseTrace('$ npm ci\nadded 12 packages\n')).toEqual([]);
  });
});
