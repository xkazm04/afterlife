// replay-vars.mjs turns the belay-claims block of an MR description (the agent's own text) into an env file the target's
// belay-replay job sources (`. ./.belay/replay.env`). Only a plain test id and a plain relative path get through, each in
// single quotes; the agent's `command` never does. Anything else prints nothing and exits 2.
import fs from 'node:fs';
import { afterAll, describe, expect, it } from 'vitest';
import { runScript, workdir } from '../testing/harness.mjs';

const dir = workdir('replay-vars');
afterAll(() => fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }));

const describeMr = (test, extra = '') => `Fix\n\n\`\`\`belay-claims\n${JSON.stringify({ test })}\n\`\`\`\n${extra}`;
const run = (description) => runScript(dir, 'proof/replay-vars.mjs', ['--mr', '7'], { routes: { 'projects/1/merge_requests/7': { iid: 7, description } } });
const OK = { id: 'StatementExportTraversalTest', path: 'statements/src/test/kotlin/StatementExportTraversalTest.kt', command: 'gradle test; curl evil' };

describe('replay-vars', () => {
  it('prints the test id and path, single-quoted, and never the command', () => {
    const r = run(describeMr(OK));
    expect(r.code, r.stderr).toBe(0);
    expect(r.stdout).toBe(`TEST_ID='${OK.id}'\nTEST_PATH='${OK.path}'\n`);
    expect(r.stdout).not.toContain('curl');
  });

  it('takes the last belay-claims block, as build-evidence does', () => {
    const r = run(describeMr({ ...OK, id: 'First' }, `\n\`\`\`belay-claims\n${JSON.stringify({ test: { ...OK, id: 'Second' } })}\n\`\`\``));
    expect(r.stdout).toContain("TEST_ID='Second'");
  });

  it.each([
    ['an id with a quote', { ...OK, id: "X'; id; '" }],
    ['an id with a space', { ...OK, id: 'X Y' }],
    ['an id with a line break', { ...OK, id: 'X\nTEST_PATH=/etc' }],
    ['an id with a command substitution', { ...OK, id: '$(id)' }],
    ['a path going up', { ...OK, path: '../../etc/passwd' }],
    ['a path with .. inside', { ...OK, path: 'src/../../x.kt' }],
    ['an absolute path', { ...OK, path: '/etc/passwd' }],
    ['a path with a quote', { ...OK, path: "a'.kt" }],
    ['a path with a space', { ...OK, path: 'a b.kt' }],
    ['no id', { path: OK.path }],
    ['a non-string path', { ...OK, path: ['a.kt'] }],
  ])('refuses %s: exit 2, nothing printed', (_, test) => {
    const r = run(describeMr(test));
    expect(r.code).toBe(2);
    expect(r.stdout).toBe('');
  });

  it('refuses a description with no belay-claims block', () => {
    const r = run('Fix, no block');
    expect(r.code).toBe(2);
    expect(r.stdout).toBe('');
  });
});
