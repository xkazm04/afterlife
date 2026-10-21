// The diff check: whitespace a lane added that no gate of the repo catches (fleet `diffCheck: true`). It reads only
// what the lane changed against base, so the repo's own formatting config is never needed or touched: trailing
// whitespace and blank lines at the end of a file (`git diff --check`), and a run of two blank lines the base
// version of that file did not have (a removed block whose blank lines both stayed).
import fs from 'node:fs';
import path from 'node:path';
import { git, runProc } from '../proc/proc';

/** git's default whitespace errors, with a CR at end of line allowed (CRLF files are not a lane's slip). */
const WHITESPACE = 'core.whitespace=blank-at-eol,space-before-tab,blank-at-eof,cr-at-eol';

/** Two blank lines in a row (a blank line holds only spaces or tabs). */
const DOUBLE_BLANK = /\n[ \t]*\r?\n[ \t]*\r?\n/g;

const doubleBlanks = (text: string): number => (text.match(DOUBLE_BLANK) ?? []).length;

/** Files over this size, and binary files, are not read. */
const MAX_BYTES = 1024 * 1024;

/**
 * Whitespace slips in the lane's staged change against baseSha, as one reason line per finding (at most 12), or []
 * when it is clean. The caller has staged everything (`git add -A`).
 */
export async function diffSlips(dir: string, baseSha: string): Promise<string[]> {
  const slips: string[] = [];
  const check = await runProc('git', ['-c', WHITESPACE, '-C', dir, 'diff', '--cached', '--check', '--no-ext-diff', baseSha]);
  if (check.code !== 0) {
    // `file:line: trailing whitespace.` then the offending line prefixed with '+': keep the location lines.
    slips.push(...check.stdout.split(/\r?\n/).filter((l) => /^[^+\s].*:\d+: /.test(l)));
  }
  const changed = (await git(dir, ['diff', '--cached', '--name-only', '-z', '--diff-filter=AM', baseSha])).split('\0').filter(Boolean);
  for (const file of changed) {
    const abs = path.join(dir, file);
    let now: Buffer;
    try {
      if (fs.statSync(abs).size > MAX_BYTES) continue;
      now = fs.readFileSync(abs);
    } catch {
      continue;
    }
    if (now.includes(0)) continue;
    const before = await runProc('git', ['-C', dir, 'show', `${baseSha}:${file}`]);
    const was = before.code === 0 ? doubleBlanks(before.stdout) : 0;
    const is = doubleBlanks(now.toString('utf8'));
    if (is > was) slips.push(`${file}: ${is - was} new run(s) of two blank lines`);
  }
  return slips.slice(0, 12);
}
