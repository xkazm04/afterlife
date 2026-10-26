// F38 part 2 for the policy MRs: a promotion or an enrollment is a branch commit to tier-state.yml, then an MR a person
// merges as the human key. Someone who can push to belay/* (an agent's account the tripwire runs as, another maintainer)
// pushing between the commit and the MR would have the operator's "Prepared by Afterlife" MR carry a tier nobody previewed.
// So, as for arm and disarm, the confirm is done only when the MR GitLab opened is headed by the commit this confirm made.
import { parseDocument } from 'yaml';
import { describe, expect, it } from 'vitest';
import type { FakeGitLab } from '@/server/gitlab/fake/fakeGitLab';
import type { GitLabPort, PlannedCommand } from '@/server/gitlab/port';
import { liveRig, policyFiles } from '../../__tests__/rig';
import { confirmIntent, previewIntent } from '../../run';
import type { ActionResponse } from '../../types';

const LEFT = 'c0ffee0000000000000000000000000000000002';
const promote = { kind: 'promote-class', project: 'ledgerline', class: 'qa.file-bug', to: 'hands_off' } as const;
const enroll = { kind: 'enroll-track', project: 'ledgerline', track: 'T4' } as const;

const policy = (gl: FakeGitLab) => gl.state.projects.find((p) => p.raw.name === 'belay-policy')!;
const reason = (r: ActionResponse) => (r.status === 'refused' ? r.reason : `not refused: ${r.status}`);
function previewId(r: ActionResponse): string {
  if (r.status !== 'preview') throw new Error(`expected a preview, got ${r.status}: ${reason(r)}`);
  return r.preview.previewId;
}

/** Someone pushes to the MR's source branch between Afterlife's commit and its MR. */
const pushedBetween = (gl: () => FakeGitLab) => (port: GitLabPort): GitLabPort => new Proxy(port, {
  get: (t, k, r) => (k === 'execute'
    ? async (c: PlannedCommand) => {
      const source = c.argv.find((a) => a.startsWith('source_branch='))?.slice('source_branch='.length);
      if (source) (policy(gl()).branches ??= {})[source] = LEFT;
      return t.execute(c);
    }
    : Reflect.get(t, k, r)),
});

async function rig(o: { unenrolled?: boolean; pushed?: boolean } = {}) {
  let fake: FakeGitLab | null = null;
  const r = await liveRig(o.pushed ? pushedBetween(() => fake!) : undefined);
  fake = r.gl;
  if (o.unenrolled) {
    const doc = parseDocument(policyFiles(r.gl)['tier-state.yml']!);
    doc.deleteIn(['agents', 'ai-guardrail-acme-lab']);
    policyFiles(r.gl)['tier-state.yml'] = doc.toString({ lineWidth: 0 });
  }
  return r;
}

describe('a policy MR confirm is done only when its own commit heads the MR', () => {
  it('promote and enroll are done when nobody pushed in between (the control)', async () => {
    const p = await rig();
    expect((await confirmIntent(p.deps, promote, previewId(await previewIntent(p.deps, promote)))).status).toBe('done');
    const e = await rig({ unenrolled: true });
    expect((await confirmIntent(e.deps, enroll, previewId(await previewIntent(e.deps, enroll)))).status).toBe('done');
  });

  it('a promotion MR headed by any other commit fails, naming it and what to do', async () => {
    const { deps } = await rig({ pushed: true });
    const r = await confirmIntent(deps, promote, previewId(await previewIntent(deps, promote)));
    expect(r.status).toBe('failed');
    const last = r.status === 'failed' ? r.results.at(-1) : undefined;
    expect(last).toMatchObject({ ok: false, made: expect.stringMatching(/^!\d+$/) });
    expect(last?.error).toContain(LEFT);
    expect(last?.error).toMatch(/Do not merge !\d+: close it, delete belay\/promote-qa\.file-bug-/);
  });

  it('an enrollment MR headed by any other commit fails the same way', async () => {
    const { deps } = await rig({ unenrolled: true, pushed: true });
    const r = await confirmIntent(deps, enroll, previewId(await previewIntent(deps, enroll)));
    expect(r.status).toBe('failed');
    expect(r.status === 'failed' && r.results.at(-1)?.error).toContain(LEFT);
  });
});
