// No screen spells a write to belay-policy itself. The exact commands and the tier-state.yml diff a screen shows are the
// server's preview (previewAction), planned from the files as they are. A hand-written one drifts: the Ladder's yq edit
// wrote `.classes[...]` while tier-state.yml is agents.<agent>.<class>, and Needs you's promotion added a `lease_days`
// field the schema does not have.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const APP = path.resolve(import.meta.dirname, '../../../app');

function sources(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return sources(p);
    return /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [p] : [];
  });
}

const HAND_WRITTEN: readonly [string, RegExp][] = [
  ['a yq edit of a YAML file', /\byq\s+(-i|e|eval)\b/],
  ['a path into tier-state.yml under classes', /\.classes\[/],
  ['a git command run in belay-policy', /git -C belay-policy\b/],
  ['a git commit or push of belay-policy', /belay-policy[^\n'"`]*\bgit (commit|push)\b|\bgit (commit|push)\b[^\n'"`]*belay-policy/],
  ['a lease_days value written into a tier record (the schema has lease_expires)', /\blease_days: (\d|\$\{)/],
  ['a tier the schema does not have', /\btier: retired\b/],
];

describe('src/app holds no hand-written write to belay-policy', () => {
  const files = sources(APP);
  it('finds the screens', () => {
    expect(files.some((f) => f.endsWith(path.join('ladder', 'LadderScreen.tsx')))).toBe(true);
    expect(files.some((f) => f.endsWith(path.join('needs-you', 'NeedsYouScreen.tsx')))).toBe(true);
  });
  it.each(HAND_WRITTEN)('no %s', (_what, re) => {
    const hits = files.flatMap((f) => fs.readFileSync(f, 'utf8').split('\n').flatMap((line, i) => (re.test(line) ? [`${path.relative(APP, f)}:${i + 1}: ${line.trim()}`] : [])));
    expect(hits).toEqual([]);
  });
});
