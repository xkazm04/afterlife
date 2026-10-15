// Every plan that commits to a branch it names refuses at preview when that branch is already there (F85, as arm's F38):
// the commit would fail after the click, or put a commit nobody previewed on an old branch. Promote and enroll name
// belay/promote-<class>-<date> and belay/enroll-<track>-<date>, which a closed MR leaves behind.
import { parseDocument } from 'yaml';
import { describe, expect, it } from 'vitest';
import type { GitLabPort } from '@/server/gitlab/port';
import { liveRig, policyFiles } from '../../__tests__/rig';
import { previewIntent } from '../../run';
import type { ActionResponse } from '../../types';

const HEAD = 'a'.repeat(40);
/** The same port, except that every branch the plan asks about is already there. */
const branchesThere = (port: GitLabPort): GitLabPort =>
  new Proxy(port, { get: (t, k, r) => (k === 'get' ? (path: string) => (/\/repository\/branches\//.test(path) ? Promise.resolve({ commit: { id: HEAD } }) : t.get(path)) : Reflect.get(t, k, r)) });

const promote = { kind: 'promote-class', project: 'ledgerline', class: 'qa.file-bug', to: 'hands_off' };
const enroll = { kind: 'enroll-track', project: 'ledgerline', track: 'T4' };
const reason = (r: ActionResponse) => (r.status === 'refused' ? r.reason : `not refused: ${r.status}`);

/** The demo group as it stands before the guardrail is enrolled: its account holds no record. */
async function unenrolled(wrap?: (p: GitLabPort) => GitLabPort) {
  const r = await liveRig(wrap);
  const doc = parseDocument(policyFiles(r.gl)['tier-state.yml']!);
  doc.deleteIn(['agents', 'ai-guardrail-acme-lab']);
  policyFiles(r.gl)['tier-state.yml'] = doc.toString({ lineWidth: 0 });
  return r;
}

describe('promote and enroll refuse a branch that is already there', () => {
  it('both preview when the branch is absent (the control)', async () => {
    const { deps } = await unenrolled();
    expect((await previewIntent(deps, promote)).status).toBe('preview');
    expect(reason(await previewIntent(deps, enroll))).not.toMatch(/already exists/);
  });

  it('promote refuses, naming the branch and its head; nothing is written', async () => {
    const { gl, deps } = await unenrolled(branchesThere);
    expect(reason(await previewIntent(deps, promote))).toMatch(/belay\/promote-qa\.file-bug-2026-10-06 already exists in acme-lab\/belay-policy \(its head is aaaaaaaa\)/);
    expect(gl.state.writes).toEqual([]);
  });

  it('enroll refuses, naming the branch and its head; nothing is written', async () => {
    const { gl, deps } = await unenrolled(branchesThere);
    expect(reason(await previewIntent(deps, enroll))).toMatch(/belay\/enroll-T4-2026-10-06 already exists in acme-lab\/belay-policy \(its head is aaaaaaaa\)/);
    expect(gl.state.writes).toEqual([]);
  });

  it('a branch read that fails other than by 404 refuses too: absent is only a 404', async () => {
    const { deps } = await unenrolled((port) => new Proxy(port, { get: (t, k, r) => (k === 'get' ? () => Promise.reject(new Error('502 Bad Gateway')) : Reflect.get(t, k, r)) }));
    expect(reason(await previewIntent(deps, promote))).toMatch(/could not read whether belay\/promote-qa\.file-bug-2026-10-06 exists .*502 Bad Gateway/);
  });
});
