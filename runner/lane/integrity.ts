// Before the review (Ascent cycle personas-web-007): an EXISTING test file or fixture the lane changed beyond what
// lane.md allows is put back to its base text, and the repair turn is told so. lane.md allows two edits to an existing
// test: a mechanical call-site update (arguments, names, imports - no assertion, expected value or case removed or
// changed) and ONE appended registry entry. Ascent decided it with the guard's own classifier; Belay has no guard, so
// the rule is a normalised diff: per file, the assertion words on the removed lines must be the ones on the added
// lines (none removed, none added), and every literal a removed assertion line held must still be on an added line.
// A deleted test file or a changed fixture is always put back. Only files that exist at base are ever touched.
import { git } from '../proc/proc';
import type { ChangeView } from './reviewPrompt';

/** Test files by the usual conventions: a test dir, `*.test.*` / `*.spec.*`, pytest's `test_*.py`, go and rust tests. */
export const TEST_FILE = /(^|\/)(__tests__|tests?|spec|e2e)\/|\.(test|spec)\.[cm]?[jt]sx?$|(^|\/)test_[^/]*\.py$|_test\.(py|go)$|_tests?\.rs$/i;
/** Fixture and snapshot dirs: data a test reads; never edited by a lane. */
export const FIXTURE = /(^|\/)(__fixtures__|fixtures?|__snapshots__|testdata)\//i;

/** Words that make or name an assertion or a test case. */
const ASSERTION = /\b(expect|assert\w*(?:\.\w+)*|should(?:\.\w+)*|it|test|describe|toBe\w*|toEqual|toStrictEqual|toMatch\w*|toThrow\w*|toContain\w*|toHave\w*)\s*[(!]|#\[test\]|\bdef\s+test_\w+/g;
/** A quoted string or a number: an expected value. */
const LITERAL = /(['"`])(?:\\.|(?!\1).)*\1|\b\d+(?:\.\d+)?\b/g;
/** An import line: a mechanical update may change these freely. */
const IMPORT = /^\s*(import\b|from\s+\S+\s+import\b|use\s|export\s.*\sfrom\s|(const|let|var)\s.*=\s*require\()/;

const words = (lines: string[]): string[] => lines.flatMap((l) => (l.match(ASSERTION) ?? []).map((w) => w.replace(/\s+/g, ''))).sort();

/**
 * Why a test file's diff (one file, `-U0`) goes beyond a mechanical update, or null when it does not. An append of
 * lines with no assertion in them (a registry entry) is mechanical by this rule.
 */
export function beyondMechanical(diff: string): string | null {
  const removed: string[] = [];
  const added: string[] = [];
  for (const l of diff.split(/\r?\n/)) {
    if (l.startsWith('---') || l.startsWith('+++')) continue;
    if (l.startsWith('-') && !IMPORT.test(l.slice(1))) removed.push(l.slice(1));
    else if (l.startsWith('+') && !IMPORT.test(l.slice(1))) added.push(l.slice(1));
  }
  const was = words(removed);
  const now = words(added);
  if (was.join(' ') !== now.join(' ')) {
    return now.length > was.length ? 'adds assertions or cases to an existing test' : 'removes or rewrites an assertion or case of an existing test';
  }
  const kept = new Set(added.flatMap((l) => l.match(LITERAL) ?? []));
  const lost = removed.filter((l) => (l.match(ASSERTION) ?? []).length).flatMap((l) => (l.match(LITERAL) ?? []).filter((v) => !kept.has(v)));
  return lost.length ? `changes an expected value of an existing test (${lost.slice(0, 3).join(', ')})` : null;
}

/** Every path the lane changed against base (tracked and untracked), with its status; renames as delete plus add. */
export async function changedAgainst(dir: string, baseSha: string): Promise<ChangeView['changed']> {
  await git(dir, ['add', '-A']);
  const f = (await git(dir, ['-c', 'core.quotepath=off', 'diff', '--cached', '--name-status', '--no-renames', '-z', baseSha])).split('\0').filter(Boolean);
  const out: ChangeView['changed'] = [];
  for (let i = 0; i + 1 < f.length; i += 2) {
    const s = f[i] ?? '';
    out.push({ status: s.startsWith('A') ? 'added' : s.startsWith('D') ? 'deleted' : 'modified', path: f[i + 1] ?? '' });
  }
  return out;
}

/** The existing test files and fixtures to put back, each with why. */
export async function integrityForecast(dir: string, baseSha: string, changed: ChangeView['changed']): Promise<{ path: string; why: string }[]> {
  const out: { path: string; why: string }[] = [];
  for (const c of changed) {
    if (c.status === 'added') continue;
    if (FIXTURE.test(c.path)) out.push({ path: c.path, why: `${c.status} an existing fixture` });
    else if (TEST_FILE.test(c.path)) {
      if (c.status === 'deleted') {
        out.push({ path: c.path, why: 'deleted an existing test' });
        continue;
      }
      const diff = await git(dir, ['--literal-pathspecs', 'diff', '--cached', '-U0', '--no-ext-diff', '--no-textconv', baseSha, '--', c.path]);
      const why = beyondMechanical(diff);
      if (why) out.push({ path: c.path, why });
    }
  }
  return out;
}

/** Puts the given paths back to their text at baseSha (a deleted one is re-created). */
export async function restoreFromBase(dir: string, baseSha: string, paths: readonly string[]): Promise<void> {
  if (paths.length) await git(dir, ['--literal-pathspecs', 'checkout', baseSha, '--', ...paths]);
}
