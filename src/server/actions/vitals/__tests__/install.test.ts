// install-skill into a temp root: the preview shows the target path and the whole file with Afterlife's path and the
// project's slug filled in; the confirm writes a fresh file, re-installs over its own unedited copy, and refuses a copy
// the repo edited. It never commits (there is no git call at all).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { SKILL_PATH } from '../install';
import { confirmProjectWrite, previewProjectWrite } from '../run';
import { AFTERLIFE, projectRig } from './rig';

const rig = projectRig();
const intent = { kind: 'install-skill' as const, project: 'grinex-portal' };
const target = () => path.join(rig.cfg.root, ...SKILL_PATH);
const fwd = (p: string) => p.replace(/\\/g, '/');

async function install() {
  const p = await previewProjectWrite(rig.deps, intent);
  if (p.status !== 'preview') return p;
  return confirmProjectWrite(rig.deps, intent, p.preview.previewId);
}

describe('install-skill', () => {
  it('previews the target path and the whole file, with the checkout path and slug filled in', async () => {
    const r = await previewProjectWrite(rig.deps, intent);
    if (r.status !== 'preview') throw new Error(JSON.stringify(r));
    expect(r.preview.commands[0]!.display).toMatch(new RegExp(`^write ${fwd(target()).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\(\\d+ lines, sha256 [0-9a-f]{12}\\)$`));
    const body = r.preview.diff.join('\n');
    expect(body).toContain(`+ name: afterlife-report`);
    expect(body).toContain(`node "${fwd(path.join(AFTERLIFE, 'cli', 'belay.mjs'))}" report --project grinex-portal --claim`);
    expect(body).toContain('`master-full`');
    expect(body).not.toMatch(/\{\{[A-Z_]+\}\}/);
    expect(existsSync(target())).toBe(false);
  });

  it('writes a fresh file into the root, and installs again over its own unedited copy', async () => {
    const r = await install();
    expect(r.status === 'done' && r.results[0]!.made).toBe('wrote .claude/skills/afterlife-report/SKILL.md');
    const first = readFileSync(target(), 'utf8');
    expect(first).toContain('--project grinex-portal');
    const again = await previewProjectWrite(rig.deps, intent);
    expect(again.status === 'preview' && again.preview.summary).toMatch(/Already installed and identical/);
    // an older install of Afterlife's own (a template since changed) is still Afterlife's: replaced
    rig.cfg = { ...rig.cfg, ci: { ...rig.cfg.ci, variants: [...rig.cfg.ci.variants, { id: 'nightly', pipelineId: '2', match: { reason: ['schedule'] } }] } };
    const r2 = await install();
    expect(r2.status).toBe('done');
    expect(readFileSync(target(), 'utf8')).toContain('`nightly`');
  });

  it('refuses a copy the repo edited, and leaves it as it is', async () => {
    mkdirSync(path.dirname(target()), { recursive: true });
    writeFileSync(target(), '---\nname: afterlife-report\n---\nour own notes\n');
    const r = await previewProjectWrite(rig.deps, intent);
    expect(r).toEqual({ status: 'refused', reason: `the repo has its own edited copy at ${fwd(target())}: Afterlife leaves it alone (delete it to install a fresh one)` });
    expect(readFileSync(target(), 'utf8')).toContain('our own notes');
    expect(rig.calls).toEqual([]);
  });
});
