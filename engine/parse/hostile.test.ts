// Hostile input must not cost quadratic time: a job log and a JUnit report both come from a repo the agent controls.
import { describe, expect, it } from 'vitest';
import { parseJUnit } from './junit';
import { cleanTrace, parseTrace } from './trace';

const N = 100_000;
const timed = (fn: () => unknown): number => {
  const t = performance.now();
  fn();
  return performance.now() - t;
};

const LINES: Record<string, string> = {
  'whitespace run': 'x' + ' '.repeat(N) + 'y',
  'pytest spaces': 'a.py::b' + ' '.repeat(N) + 'x',
  'surefire prefix': '[ERROR] ' + 'Tests run: '.repeat(N / 11),
  'surefire spaces': 'Tests run:' + ' '.repeat(N) + 'x',
  'pytest path': 'a.py'.repeat(N / 4),
  'pytest names': 'a.py::' + 'b'.repeat(N),
  'jest mark': '✓ ' + '1 '.repeat(N / 2),
  'jest duration': '✓ x' + ' '.repeat(N) + 'x',
  'gradle arrows': 'a > '.repeat(N / 4),
  'gradle word': 'a > ' + 'PASSED '.repeat(N / 7),
  'go test': '--- PASS: ' + 'a'.repeat(N),
};

describe('hostile trace lines', () => {
  for (const [name, line] of Object.entries(LINES)) {
    it(`parses a ${N / 1000} KB ${name} line in under 500 ms`, () => {
      expect(timed(() => parseTrace(line + '\n' + line))).toBeLessThan(500);
    });
  }

  it('cleanTrace bounds each line to 4096 characters', () => {
    expect(cleanTrace('a'.repeat(N)).every((l) => l.length <= 4096)).toBe(true);
  });
});

describe('hostile JUnit XML', () => {
  for (const [name, open] of [['comment', '<!--'], ['processing instruction', '<?'], ['doctype', '<!DOCTYPE']] as const) {
    it(`parses ${N / 1000} KB of unclosed ${name} openers in under 500 ms`, () => {
      expect(timed(() => parseJUnit(open.repeat(N / open.length)))).toBeLessThan(500);
    });
  }

  it('still reads a comment, a processing instruction and a doctype around real cases', () => {
    const xml = '<?xml version="1.0"?><!DOCTYPE x><!-- hi --><testsuite><testcase classname="a" name="b"/></testsuite>';
    expect(parseJUnit(xml).map((c) => c.name)).toEqual(['b']);
  });
});
