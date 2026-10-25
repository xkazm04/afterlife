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

// A gap is opened through the server's gap door (stage-gap-mr): one commit per file, a draft MR labelled maturity::gap. A screen
// that spelled `glab mr create` or a commit to repository/commits drifted from it in commit shape, base branch, title and
// work-item link, and `belay probe` is a command that does not exist. `belay scan` is not listed: cli/belay.mjs has it now,
// and it only reads (a day-0 scan of a checkout), so a screen may show it as the read it is.
const HAND_WRITTEN_GAP: readonly [string, RegExp][] = [
  ['a glab mr create', /\bglab mr create\b/],
  ['a commit through glab api to repository/commits', /repository\/commits/],
  ['a glab issue create', /\bglab issue create\b/],
  ['a belay probe', /\bbelay probe\b/],
  // A real project's writes are the server's previews (actions/vitals): queue-runs, enable-app-insights.
  ['an az pipelines run', /\baz pipelines (run|build queue)\b/],
  ['an App Insights component create', /\bapp-insights component create\b/],
  ['an App Service app setting write', /\bwebapp config appsettings set\b/],
];

/**
 * Text that is not a write and that no task here may change: the kit's component gallery shows sample command text, so it is
 * named here and a new one anywhere else still fails.
 */
const NOT_A_SEND: readonly string[] = [path.join('features', 'kit')];

describe('src/app holds no hand-written gap MR, gap issue or probe', () => {
  const files = sources(APP).filter((f) => !NOT_A_SEND.some((n) => f.includes(n)));
  it.each(HAND_WRITTEN_GAP)('no %s', (_what, re) => {
    const hits = files.flatMap((f) => fs.readFileSync(f, 'utf8').split('\n').flatMap((line, i) => (re.test(line) ? [`${path.relative(APP, f)}:${i + 1}: ${line.trim()}`] : [])));
    expect(hits).toEqual([]);
  });
  it('the allowance names files that exist', () => {
    for (const n of NOT_A_SEND) expect(sources(APP).some((f) => f.includes(n)), n).toBe(true);
  }, 120_000); // walks the whole src/app tree once per allowance: seconds alone, past the 30 s default under a loaded full suite
});
