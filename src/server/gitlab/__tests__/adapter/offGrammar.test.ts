// The one guard between a planned command and a GitLab write: every builder's output is in the grammar, and each way
// out of it (another host that would receive the token, -F @file, --input, a second path, a dot segment) is refused
// with its reason, before anything runs.
import { describe, expect, it } from 'vitest';
import { offGrammar } from '../../adapter/glabAdapter';
import { planBuilders } from '../../plan/builders';

const HOST = 'git.example.com';

function everyBuild(host?: string) {
  const b = planBuilders(host);
  const project = 'acme/ledger line';
  return [
    b.createMr({ project, sourceBranch: 'b', targetBranch: 'main', title: 'T?#', description: '-F x', labels: ['a', 'b'], removeSourceBranch: true }),
    b.addNote({ project, iid: 3, body: '--hostname evil ../ ?q' }),
    b.setLabels({ project, iid: 3, add: ['belay::tier::assisted'], remove: ['x'] }),
    b.setIssueLabels({ project: 7, iid: 4, add: ['cra::ready'] }),
    b.commitFile({ project, path: '../../etc/a b?.yml', branch: 'belay/x', content: 'c', message: 'm', action: 'update', startBranch: 'main', lastCommitId: 'abc' }),
    b.pauseSchedule({ project, scheduleId: 9 }),
    b.approveDeployment({ project, deploymentId: 5, status: 'approved', comment: 'ok' }),
  ];
}

describe('offGrammar', () => {
  it('accepts every builder output, with the configured host and without one', () => {
    for (const p of everyBuild(HOST)) expect(offGrammar(p.argv, HOST), p.display).toBeNull();
    for (const p of everyBuild()) expect(offGrammar(p.argv, undefined), p.display).toBeNull();
  });

  it('refuses even a builder output that would walk out: a file named ".." (no git tree holds one)', () => {
    const p = planBuilders(HOST).commitFile({ project: 7, path: '..', branch: 'b', content: '', message: 'm', action: 'create' });
    expect(offGrammar(p.argv, HOST)).toMatch(/dot segment/);
  });

  const refused: Array<[string, readonly string[], string | undefined, RegExp]> = [
    ['not glab api', ['mr', 'merge', '3'], HOST, /only `glab api`/],
    ['a foreign host', ['api', '--hostname', 'evil.example', '--method', 'POST', 'projects/1/notes'], HOST, /configured host/],
    ['--hostname with no host configured', ['api', '--hostname', HOST, '--method', 'POST', 'projects/1/notes'], undefined, /configured host/],
    ['--hostname with no value', ['api', '--method', 'POST', 'projects/1/notes', '--hostname'], HOST, /configured host/],
    ['-F, which reads @files', ['api', '--method', 'POST', 'projects/1/notes', '-F', 'body=@/etc/passwd'], HOST, /flag -F/],
    ['--input', ['api', '--method', 'POST', '--input', 'x', 'projects/1/notes'], HOST, /flag --input/],
    ['two paths', ['api', '--method', 'POST', 'projects/1/notes', 'projects/2/notes'], HOST, /one endpoint/],
    ['no path', ['api', '--method', 'POST', '-f', 'a=b'], HOST, /one endpoint/],
    ['a .. segment', ['api', '--method', 'POST', 'projects/7/merge_requests/1/../../../../user'], HOST, /dot segment/],
    ['a . segment', ['api', '--method', 'PUT', 'projects/7/issues/./3'], HOST, /dot segment/],
    ['a leading ..', ['api', '--method', 'PUT', '../user'], HOST, /dot segment/],
    ['a query', ['api', '--method', 'PUT', 'projects/7/issues/3?confidential=true'], HOST, /query/],
    ['a fragment', ['api', '--method', 'PUT', 'projects/7/issues/3#x'], HOST, /fragment/],
    ['-f with no value', ['api', '--method', 'POST', 'projects/1/notes', '-f'], HOST, /-f needs a value/],
    ['--method with no value', ['api', 'projects/1/notes', '--method'], HOST, /--method needs a value/],
  ];
  for (const [what, argv, host, why] of refused) {
    it(`refuses ${what}`, () => expect(offGrammar(argv, host)).toMatch(why));
  }
});
