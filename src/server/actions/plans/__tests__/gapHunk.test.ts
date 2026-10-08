// A maturity proposal's file is often a hunk of a file the project already has (a few context lines and '+' lines of its
// .gitlab-ci.yml), never the whole file. The door applies the hunk to the file as the project holds it, and refuses when it
// cannot do that exactly: a hunk sent as the file's content would overwrite the file with a fragment.
import { describe, expect, it } from 'vitest';
import { parseIntent } from '../../intents';
import { confirmIntent, previewIntent } from '../../run';
import { liveRig } from '../../__tests__/rig';
import { ActionRefused } from '../context';
import { applyHunk } from '../hunk';

const gap = (files: unknown[]) => ({
  kind: 'stage-gap-mr', project: 'ledgerline', gap: 'g1', stage: 'secure', from: 3, to: 4, title: 'Re-derive findings', branch: 'belay/gap-g1', files,
});
const CI = '.gitlab-ci.yml';
const clean = { path: CI, hunk: ['   - template: Jobs/Dependency-Scanning.gitlab-ci.yml', '   - template: Jobs/Secret-Detection.gitlab-ci.yml', '+  - local: .gitlab/belay/sbom-rederive.yml'] };

async function plan(files: unknown[]) {
  const { deps, gl } = await liveRig();
  const r = await previewIntent(deps, gap(files));
  return { r, gl };
}

describe('a hunk in a gap MR', () => {
  it('applies to the base file: the file keeps every other line, the added lines land after the context, nothing is written by a preview', async () => {
    const { r, gl } = await plan([clean]);
    if (r.status !== 'preview') throw new Error(`${r.status}`);
    const sent = r.preview.commands[0]?.argv.join('\n') ?? '';
    expect(sent).toContain('stages: [build, test, review, deploy]');
    expect(sent).toContain('./gradlew test');
    expect(sent).toMatch(/Secret-Detection\.gitlab-ci\.yml\n {2}- local: \.gitlab\/belay\/sbom-rederive\.yml\n\nbuild:/);
    expect(r.preview.commands[0]?.argv.slice(2, 3)).toEqual(['PUT']);
    expect(r.preview.diff).toContain('+   - local: .gitlab/belay/sbom-rederive.yml');
    expect(gl.state.writes).toEqual([]);
  });

  it('is refused when the context lines do not match the file exactly and in order', async () => {
    const swapped = { path: CI, hunk: ['   - template: Jobs/Secret-Detection.gitlab-ci.yml', '   - template: Jobs/Dependency-Scanning.gitlab-ci.yml', '+  - local: x.yml'] };
    const { r, gl } = await plan([swapped]);
    expect(r).toMatchObject({ status: 'refused', reason: expect.stringMatching(/context lines do not match/) });
    expect(gl.state.writes).toEqual([]);
  });

  // haq full r1, robustness-4 (this round): the hunk door refuses an ambiguous match, but no test covers that refusal.
  it('is refused when the context lines match the file in two places, and nothing is planned or written', async () => {
    const twice = { path: CI, hunk: ['   image: gradle:8-jdk21', '+  tags: [belay]'] };
    const { deps, gl } = await liveRig();
    const r = await previewIntent(deps, gap([{ path: '.gitlab/belay/new.yml', content: 'a: 1\n' }, twice]));
    expect(r).toMatchObject({ status: 'refused', reason: expect.stringMatching(/match \.gitlab-ci\.yml in 2 places/) });
    expect(r).not.toHaveProperty('preview');
    expect(await confirmIntent(deps, gap([twice]), 'any')).toMatchObject({ status: 'refused' });
    expect(gl.state.writes).toEqual([]);
  });

  it('applyHunk throws ActionRefused for a context that matches in two places', () => {
    expect(() => applyHunk(CI, 'a\nx\nb\nx\n', [' x', '+y'])).toThrow(ActionRefused);
  });

  it('is refused when the file does not exist: there is nothing to apply it to', async () => {
    const { r } = await plan([{ path: '.gitlab/security-policies/policy.yml', hunk: [' scan_result_policy:', '+approval_policy:'] }]);
    expect(r).toMatchObject({ status: 'refused', reason: expect.stringMatching(/does not exist/) });
  });

  it('is refused when it has no context to find its place by', async () => {
    const { r } = await plan([{ path: CI, hunk: ['+  - local: x.yml'] }]);
    expect(r.status).toBe('refused');
  });

  // F83: content is a whole new file. Sent for a file the project has, it replaced that file (here the CI config) with no
  // last_commit_id, behind a preview of its first 12 lines.
  it('is refused as content for a file the project already has: an existing file changes only by a hunk', async () => {
    const { r, gl } = await plan([{ path: CI, content: 'stages: [build]\n' }]);
    expect(r).toMatchObject({ status: 'refused', reason: expect.stringMatching(/\.gitlab-ci\.yml already exists on main.*hunk/) });
    expect(gl.state.writes).toEqual([]);
  });

  // F84: a new file is often a CI job file the gap's hunk includes, and the MR pipeline runs it: every line is shown.
  it('a new file is shown whole in the preview, not its first 12 lines', async () => {
    const job = Array.from({ length: 20 }, (_, i) => `line${i}: x`);
    const { r } = await plan([{ path: '.gitlab/belay/job.yml', content: `${job.join('\n')}\n` }]);
    if (r.status !== 'preview') throw new Error(`${r.status}`);
    expect(r.preview.diff).toContain('+ line19: x');
    expect(r.preview.diff).not.toContain('+ ...');
  });

  it('a whole new file is still its content', async () => {
    const { r } = await plan([{ path: '.gitlab/belay/new.yml', content: 'a: 1\n' }]);
    if (r.status !== 'preview') throw new Error(`${r.status}`);
    expect(r.preview.commands[0]?.argv.slice(2, 3)).toEqual(['POST']);
  });
});

describe('the intent carries content or a hunk, never both or neither', () => {
  const parse = (f: unknown) => parseIntent({ ...gap([f]), kind: 'stage-gap-mr' });
  it('accepts either', () => {
    expect(parse({ path: CI, hunk: [' a', '+b'] }).ok).toBe(true);
    expect(parse({ path: CI, content: 'a\n' }).ok).toBe(true);
  });
  it('refuses both, neither, a line with another mark, and a hunk with nothing added', () => {
    expect(parse({ path: CI, content: 'a', hunk: [' a', '+b'] }).ok).toBe(false);
    expect(parse({ path: CI }).ok).toBe(false);
    expect(parse({ path: CI, hunk: [' a', '-b', '+c'] }).ok).toBe(false);
    expect(parse({ path: CI, hunk: [' a', ' b'] }).ok).toBe(false);
    expect(parse({ path: CI, hunk: [] }).ok).toBe(false);
  });
});
