// Job-trace reader: when a job produced no JUnit report, the test results are recovered from the raw
// GitLab job log. Recognises Gradle, Maven Surefire, Jest/Vitest, pytest and `go test` output. It strips
// ANSI colours and GitLab section markers first, and keeps the lines after a failure as its output.
import type { CaseStatus, TestCase } from './junit';

const ANSI = /\x1b\[[0-9;?]*[A-Za-z]/g;
const SECTION = /section_(?:start|end):\d+:[\w.-]+\r?/g;
const MAX_OUTPUT_LINES = 40;
const MAX_LINE = 4096; // a hostile log line must not cost more than this much regex work
const DURATION = /\s\(?\d+(?:\.\d+)?\s?m?s\)?$/; // Jest / Vitest print the time after the name

export function cleanTrace(raw: string): string[] {
  return raw.replace(SECTION, '').replace(ANSI, '').replace(/\r/g, '\n').split('\n').map((l) => l.slice(0, MAX_LINE).trimEnd());
}

interface Hit {
  classname: string;
  name: string;
  status: CaseStatus;
}

const STATUS: Record<string, CaseStatus> = { PASSED: 'passed', FAILED: 'failed', SKIPPED: 'skipped', ERROR: 'error', PASS: 'passed', FAIL: 'failed', SKIP: 'skipped' };

function hitOf(line: string): Hit | null {
  let m = /^\s*(\S+) > (.+?) (PASSED|FAILED|SKIPPED)$/.exec(line); // Gradle
  if (m) return { classname: m[1] ?? '', name: (m[2] ?? '').replace(/\(\)$/, ''), status: STATUS[m[3] ?? ''] ?? 'error' };
  m = /^(?:\[(?:ERROR|WARNING|INFO)\]\s+)?([\w.$]+)\.(\w+)\s+Time elapsed: [\d.]+ s\s+<<< (FAILURE|ERROR)!/.exec(line); // Surefire
  if (m) return { classname: m[1] ?? '', name: m[2] ?? '', status: m[3] === 'FAILURE' ? 'failed' : 'error' };
  m = /^(\S+\.py)::(\S+)\s+(PASSED|FAILED|SKIPPED|ERROR)\b/.exec(line); // pytest -v
  if (m) return { classname: m[1] ?? '', name: m[2] ?? '', status: STATUS[m[3] ?? ''] ?? 'error' };
  m = /^\s*--- (PASS|FAIL|SKIP): (\S+)/.exec(line); // go test -v
  if (m) return { classname: '', name: m[2] ?? '', status: STATUS[m[1] ?? ''] ?? 'error' };
  m = /^\s*(✓|✔|√|✕|✗|×)\s+(.+)$/.exec(line); // Jest / Vitest verbose
  if (m) return { classname: '', name: (m[2] ?? '').replace(DURATION, '').trimEnd(), status: /[✓✔√]/.test(m[1] ?? '') ? 'passed' : 'failed' };
  return null;
}

export function parseTrace(raw: string): TestCase[] {
  const lines = cleanTrace(raw);
  const cases: TestCase[] = [];
  let open: TestCase | null = null;
  let taken = 0;
  for (const line of lines) {
    const hit = hitOf(line);
    if (hit) {
      open = { ...hit, message: '', output: '' };
      taken = 0;
      cases.push(open);
      continue;
    }
    if (open && (open.status === 'failed' || open.status === 'error')) {
      if (line.trim() === '' || taken >= MAX_OUTPUT_LINES) open = null; // a blank line ends the failure text
      else {
        open.output += `${open.output ? '\n' : ''}${line.trim()}`;
        taken++;
      }
    }
  }
  // Surefire also prints `[ERROR]   Class.method:42 message` lines in its summary.
  for (const line of lines) {
    const m = /^\[ERROR\]\s+(?:[\w.$]+\.)?(\w+)\.(\w+):\d+\s+(.*)$/.exec(line);
    if (m && !cases.some((c) => c.name === m[2] && c.classname.endsWith(m[1] ?? ''))) {
      cases.push({ classname: m[1] ?? '', name: m[2] ?? '', status: 'failed', message: m[3] ?? '', output: m[3] ?? '' });
    }
  }
  return cases;
}
