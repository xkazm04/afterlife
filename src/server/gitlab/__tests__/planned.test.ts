import { describe, expect, it } from 'vitest';
import { planBuilders, shellQuote } from '../plan/builders';

const plan = planBuilders();

describe('PlannedCommand builders: exact argv', () => {
  it('createMr', () => {
    const c = plan.createMr({ project: 42, sourceBranch: 'belay/x', targetBranch: 'main', title: 'Fix: round', description: 'Belay-Task: 01J', labels: ['proof::pass', 'a'] });
    expect(c.argv).toEqual([
      'api', '--method', 'POST', 'projects/42/merge_requests',
      '-f', 'source_branch=belay/x', '-f', 'target_branch=main', '-f', 'title=Fix: round',
      '-f', 'description=Belay-Task: 01J', '-f', 'labels=proof::pass,a',
    ]);
    expect(c.risk).toBe('low');
    expect(c.display).toBe(
      "glab api --method POST projects/42/merge_requests -f source_branch=belay/x -f target_branch=main -f 'title=Fix: round' -f 'description=Belay-Task: 01J' -f labels=proof::pass,a",
    );
  });

  it('createMr omits optional fields and encodes a path project', () => {
    const c = plan.createMr({ project: 'afterlife3274741/ledgerline', sourceBranch: 's', targetBranch: 't', title: 'T' });
    expect(c.argv.slice(0, 4)).toEqual(['api', '--method', 'POST', 'projects/afterlife3274741%2Fledgerline/merge_requests']);
    expect(c.argv.filter((a) => a.startsWith('description=') || a.startsWith('labels='))).toEqual([]);
  });

  it('addNote', () => {
    const c = plan.addNote({ project: 7, iid: 3, body: 'hi' });
    expect(c.argv).toEqual(['api', '--method', 'POST', 'projects/7/merge_requests/3/notes', '-f', 'body=hi']);
    expect(c.risk).toBe('low');
  });

  it('setLabels uses add_labels/remove_labels, and a tier label is policy risk', () => {
    expect(plan.setLabels({ project: 7, iid: 3, add: ['proof::pass'], remove: ['proof::fail'] }).argv).toEqual([
      'api', '--method', 'PUT', 'projects/7/merge_requests/3', '-f', 'add_labels=proof::pass', '-f', 'remove_labels=proof::fail',
    ]);
    expect(plan.setLabels({ project: 7, iid: 3, add: ['proof::pass'] }).risk).toBe('low');
    expect(plan.setLabels({ project: 7, iid: 3, add: ['belay::tier::hands_off'] }).risk).toBe('policy');
  });

  it('commitFile with startBranch creates the branch in the same call', () => {
    const c = plan.commitFile({ project: 7, path: 'tier-state.yml', branch: 'belay/promote-x', startBranch: 'main', content: 'a', message: 'm', action: 'update' });
    expect(c.argv.slice(-2)).toEqual(['-f', 'start_branch=main']);
    expect(plan.commitFile({ project: 7, path: 'a', branch: 'b', content: 'a', message: 'm', action: 'create' }).argv.join(' ')).not.toContain('start_branch');
  });

  it('setIssueLabels edits an issue (the CRA clock), low risk', () => {
    expect(plan.setIssueLabels({ project: 7, iid: 12, add: ['cra::ready-to-sign'], remove: ['cra::drafting'] }).argv).toEqual([
      'api', '--method', 'PUT', 'projects/7/issues/12', '-f', 'add_labels=cra::ready-to-sign', '-f', 'remove_labels=cra::drafting',
    ]);
    expect(plan.setIssueLabels({ project: 7, iid: 12, add: ['x'] }).risk).toBe('low');
  });

  it('commitFile: POST creates, PUT updates, policy files are policy risk', () => {
    const upd = plan.commitFile({ project: 9, path: 'belay-policy/tier-state.yml', branch: 'main', content: 'a: 1\n', message: 'tripwire', action: 'update' });
    expect(upd.argv).toEqual([
      'api', '--method', 'PUT', 'projects/9/repository/files/belay-policy%2Ftier-state.yml',
      '-f', 'branch=main', '-f', 'commit_message=tripwire', '-f', 'content=a: 1\n',
    ]);
    expect(upd.risk).toBe('policy');
    const add = plan.commitFile({ project: 9, path: 'events/9.jsonl', branch: 'main', content: '{}', message: 'm', action: 'create' });
    expect(add.argv.slice(1, 3)).toEqual(['--method', 'POST']);
    expect(add.risk).toBe('low');
  });

  it('commitFile: an update names the last commit it was read at (last_commit_id); a create has none to name', () => {
    const upd = plan.commitFile({ project: 9, path: 'tier-state.yml', branch: 'main', content: 'a', message: 'm', action: 'update', lastCommitId: 'f'.repeat(40) });
    expect(upd.argv.slice(-2)).toEqual(['-f', `last_commit_id=${'f'.repeat(40)}`]);
    expect(upd.file).toEqual({ project: 9, path: 'tier-state.yml', branch: 'main' });
    const add = plan.commitFile({ project: 9, path: 'new.yml', branch: 'main', content: 'a', message: 'm', action: 'create', lastCommitId: 'f'.repeat(40) });
    expect(add.argv.join(' ')).not.toContain('last_commit_id');
  });

  it('pauseSchedule', () => {
    const c = plan.pauseSchedule({ project: 9, scheduleId: 12 });
    expect(c.argv).toEqual(['api', '--method', 'PUT', 'projects/9/pipeline_schedules/12', '-f', 'active=false']);
    expect(c.risk).toBe('policy');
  });

  it('approveDeployment is merge risk', () => {
    const c = plan.approveDeployment({ project: 9, deploymentId: 4003, status: 'approved', comment: 'ok' });
    expect(c.argv).toEqual(['api', '--method', 'POST', 'projects/9/deployments/4003/approval', '-f', 'status=approved', '-f', 'comment=ok']);
    expect(c.risk).toBe('merge');
  });

  it('adds --hostname for a self-managed host', () => {
    const c = planBuilders('gitlab.example.com').addNote({ project: 1, iid: 1, body: 'x' });
    expect(c.argv.slice(0, 3)).toEqual(['api', '--hostname', 'gitlab.example.com']);
    expect(c.display).toContain('--hostname gitlab.example.com');
  });

  it('shellQuote escapes single quotes', () => {
    expect(shellQuote("it's")).toBe("'it'\\''s'");
    expect(shellQuote('plain-1.2/x')).toBe('plain-1.2/x');
  });
});
