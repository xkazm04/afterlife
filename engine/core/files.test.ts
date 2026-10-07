// `{"$file": path}` is how a prove input carries a big evidence file. The text it points at ends up in a Proof Block
// that is posted on a public merge request, so a reference must stay inside the job's own files: never /proc, never
// a .git folder (a clone URL there can hold the job token), never through a symlink, and never outside `prove`.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { main } from '../cli';
import { capture, ctx, ROOT } from '../__tests__/helpers';
import { inlineFiles, readInput } from './files';

const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'belay-files-')));
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

const SECRET = 'BELAY_BOT_TOKEN=glpat-not-a-real-token';
const outside = path.join(tmp, 'outside');
const job = path.join(tmp, 'job'); // $CI_PROJECT_DIR
const dotBelay = path.join(job, '.belay'); // where build-evidence writes the input
for (const d of [outside, dotBelay, path.join(job, 'evidence'), path.join(job, '.belay-policy', '.git')]) fs.mkdirSync(d, { recursive: true });
fs.writeFileSync(path.join(outside, 'environ'), SECRET);
fs.writeFileSync(path.join(job, '.belay-policy', '.git', 'config'), 'url = https://gitlab-ci-token:not-a-real-token@gitlab.com/g/belay-policy.git');
fs.writeFileSync(path.join(job, 'evidence', 'junit.xml'), '<testsuite/>');
fs.symlinkSync(outside, path.join(job, 'evidence', 'link'), 'junction'); // a directory link, no privilege needed on Windows
const write = (file: string, value: unknown): string => (fs.writeFileSync(file, JSON.stringify(value)), file);

describe('$file stays inside its root', () => {
  it('refuses a path outside the root: absolute, ../ or through a symlink', () => {
    for (const ref of [path.join(outside, 'environ'), '../../outside/environ', path.join(job, 'evidence', 'link', 'environ')]) {
      expect(() => inlineFiles(ctx, { x: { $file: ref } }, dotBelay, job)).toThrow(/outside/);
    }
  });

  it('refuses anything under a .git folder, even inside the root', () => {
    expect(() => inlineFiles(ctx, { x: { $file: path.join(job, '.belay-policy', '.git', 'config') } }, dotBelay, job)).toThrow(/\.git/);
  });

  it('reads an absolute path inside the root, the shape build-evidence writes', () => {
    expect(inlineFiles(ctx, { j: { $file: path.join(job, 'evidence', 'junit.xml') } }, dotBelay, job)).toEqual({ j: '<testsuite/>' });
  });

  it('defaults the root to the input file folder', () => {
    const input = write(path.join(dotBelay, 'in.json'), { j: { $file: '../evidence/junit.xml' } });
    expect(() => readInput(ctx, input)).toThrow(/outside/);
    expect(readInput(ctx, input, job)).toEqual({ j: '<testsuite/>' });
  });
});

describe('only prove inlines $file', () => {
  const task = { flow: 'guardrail', run_id: 'pipeline-1', project_id: 1, trailer: 'Belay-Task: 01JA0000000000000000000000' };
  const policy = path.join(ROOT, 'policy', 'trust-policy.yml');

  it('prove --files-root widens the root to the job folder', () => {
    fs.writeFileSync(path.join(job, 'mr.diff'), 'diff --git a/a.txt b/a.txt\n--- a/a.txt\n+++ b/a.txt\n@@ -1,1 +1,1 @@\n-old line\n+new line here\n');
    const input = write(path.join(dotBelay, 'cited.json'), { task, claims: [{ id: 'f1', text: 't', quote: { file: 'a.txt', text: 'new line here' } }], diff: { $file: path.join(job, 'mr.diff') } });
    const narrow = capture();
    expect(main(['prove', '--class', 'cited-diff', '--input', input, '--policy', policy], narrow.io)).toBe(2);
    expect(narrow.json()).toMatchObject({ error: expect.stringMatching(/outside/) });
    const wide = capture();
    expect(main(['prove', '--class', 'cited-diff', '--input', input, '--policy', policy, '--files-root', job], wide.io)).toBe(0);
  });

  it('ledger append takes an event field literally, never as a file to read', () => {
    const event = write(path.join(dotBelay, 'event.json'), {
      at: '2026-10-07T00:00:00Z', agent: { $file: path.join(outside, 'environ') }, action_class: 'dep.patch', kind: 'tier_decision',
      tier_at_time: 'supervised', subject: { project_id: 1, type: 'mr', iid: 7 }, payload_ref: 'https://gitlab.com/g/p/-/merge_requests/7', observed_by: 'ci_job',
    });
    const c = capture();
    expect(main(['ledger', 'append', '--event', event, '--chain', path.join(tmp, 'events.jsonl')], c.io)).toBe(2);
    expect(c.out()).not.toContain(SECRET);
  });

  it('gate reads the proof as JSON: a $file in it is not followed', () => {
    const proof = write(path.join(dotBelay, 'proof.json'), { schema: 'belay.proof/1', class: 'exploit-test', verdict: { $file: path.join(outside, 'environ') }, checks: [], envelope: { within: true }, engine: {} });
    const guard = write(path.join(dotBelay, 'guardrail.json'), { verdict: 'pass' });
    const c = capture();
    main(['gate', '--policy', policy, '--state', path.join(ROOT, 'policy', 'tier-state.yml'), '--class', 'dep-bump.patch', '--proof', proof, '--guardrail', guard], c.io);
    expect(c.out()).not.toContain(SECRET);
  });
});
