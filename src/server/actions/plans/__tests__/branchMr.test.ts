// Every MR Belay opens comes from a branch the plan creates (plans/mr/branchMr.ts): promote, enroll, a gap and arm/disarm
// alike refuse a branch already there at preview, ask GitLab to remove it on merge, and are done only when the MR is
// headed by the commit the confirm made (F38). Arm finds its target by locate's rule: never Belay's own, never ambiguous.
import { parseDocument } from 'yaml';
import { describe, expect, it } from 'vitest';
import type { FakeGitLab } from '@/server/gitlab/fake/fakeGitLab';
import { LEDGERLINE_CI } from '@/server/gitlab/fake/demo/ciFile';
import type { GitLabPort, PlannedCommand } from '@/server/gitlab/port';
import type { GlProject } from '@/server/gitlab/types';
import { SEED_NOW } from '@/server/index/seed';
import { liveRig, policyFiles } from '../../__tests__/rig';
import { removeBlock } from '../../arm/block';
import { DEMO_PIN } from '../../arm/config';
import { armOf } from '../../arm/content';
import { confirmIntent, previewIntent, type ActionDeps } from '../../run';
import type { ActionResponse } from '../../types';

const DAY = SEED_NOW.toISOString().slice(0, 10);
const LEFT = 'c0ffee0000000000000000000000000000000001';
const PROMOTE = { kind: 'promote-class', project: 'ledgerline', class: 'qa.file-bug', to: 'hands_off' } as const;
const ENROLL = { kind: 'enroll-track', project: 'ledgerline', track: 'T4' } as const;
const GAP = {
  kind: 'stage-gap-mr', project: 'ledgerline', gap: 'g1', stage: 'verify', from: 1, to: 2, title: 'raise it', branch: 'belay/gap-g1',
  files: [{ path: '.gitlab/belay/new.yml', content: 'job:\n  script: [true]\n' }],
} as const;
const arm = (project: string) => ({ kind: 'arm-track', project, track: 'T4' }) as const;

const named = (gl: FakeGitLab, name: string) => gl.state.projects.find((p) => p.raw.name === name)!;
const reason = (r: ActionResponse) => (r.status === 'refused' ? r.reason : `not refused: ${r.status}`);
function preview(r: ActionResponse) {
  if (r.status !== 'preview') throw new Error(`expected a preview, got ${r.status}: ${reason(r)}`);
  return r.preview;
}
const UNARMED = (() => {
  const r = removeBlock(LEDGERLINE_CI, armOf('T4')!);
  if (!r.ok) throw new Error('the demo file has no T4 block');
  return r.content;
})();

/** The live rig, arm settings given, ledgerline's T4 unarmed and guard.block without a record (so T4 can be enrolled). */
async function rig(wrap?: (p: GitLabPort) => GitLabPort) {
  const r = await liveRig(wrap);
  named(r.gl, 'ledgerline').files['.gitlab-ci.yml'] = UNARMED;
  const doc = parseDocument(policyFiles(r.gl)['tier-state.yml']!);
  doc.deleteIn(['agents', 'ai-guardrail-acme-lab']);
  policyFiles(r.gl)['tier-state.yml'] = doc.toString({ lineWidth: 0 });
  return { ...r, deps: { ...r.deps, arm: { ok: true, pin: DEMO_PIN } } as ActionDeps };
}

describe('a branch MR whose branch already exists is refused at preview', () => {
  it('promote names the branch and its head; nothing is written', async () => {
    const { gl, deps } = await rig();
    (named(gl, 'belay-policy').branches ??= {})[`belay/promote-qa.file-bug-${DAY}`] = LEFT;
    const why = reason(await previewIntent(deps, PROMOTE));
    expect(why).toMatch(new RegExp(`belay/promote-qa\\.file-bug-${DAY} already exists .*its head is c0ffee00`));
    expect(gl.state.writes).toEqual([]);
  });

  it('enroll names the branch', async () => {
    const { gl, deps } = await rig();
    expect(preview(await previewIntent(deps, ENROLL)).branch).toBe(`belay/enroll-T4-${DAY}`);
    (named(gl, 'belay-policy').branches ??= {})[`belay/enroll-T4-${DAY}`] = LEFT;
    expect(reason(await previewIntent(deps, ENROLL))).toMatch(new RegExp(`belay/enroll-T4-${DAY} already exists`));
  });

  it('GUARD (passes today): arm keeps its refusal text', async () => {
    const { gl, deps } = await rig();
    (named(gl, 'ledgerline').branches ??= {})['belay/arm-guardrail'] = LEFT;
    expect(reason(await previewIntent(deps, arm('ledgerline')))).toMatch(
      /belay\/arm-guardrail already exists in acme-lab\/core-banking\/ledgerline \(its head is c0ffee00\).*delete the branch, or merge or close its MR/,
    );
  });
});

describe('every branch MR asks GitLab to remove its branch on merge', () => {
  it('promote, enroll and a gap carry -f remove_source_branch=true on the MR create', async () => {
    const { deps } = await rig();
    for (const intent of [PROMOTE, ENROLL, GAP]) {
      const mr = preview(await previewIntent(deps, intent)).commands.at(-1)!.argv;
      const at = mr.indexOf('remove_source_branch=true');
      expect(at > 0 && mr[at - 1] === '-f', `${intent.kind}: ${mr.join(' ')}`).toBe(true);
    }
  });
});

describe("arm's target is found by locate's rule", () => {
  it("refuses Belay's own project", async () => {
    const { gl, deps } = await rig();
    named(gl, 'belay-ledger').files['.gitlab-ci.yml'] = UNARMED;
    expect(reason(await previewIntent(deps, arm('belay-ledger')))).toMatch(/belay-ledger is Belay's own project/);
    expect(gl.state.writes).toEqual([]);
  });

  it('refuses a path that names two projects when the index has no GitLab id, naming both', async () => {
    const twin = (port: GitLabPort): GitLabPort => new Proxy(port, {
      get: (t, k, r) => (k === 'listProjects'
        ? async (g: string | number) => {
          const all: GlProject[] = await t.listProjects(g);
          return [...all, ...all.filter((p) => p.path === 'ledgerline').map((p) => ({ ...p, id: 90019999, pathWithNamespace: 'acme-lab/other/ledgerline' }))];
        }
        : Reflect.get(t, k, r)),
    });
    const { deps } = await rig(twin);
    const why = reason(await previewIntent({ ...deps, gitlabId: async () => null }, arm('ledgerline')));
    expect(why).toMatch(/ledgerline names 2 projects/);
    expect(why).toContain('acme-lab/core-banking/ledgerline');
    expect(why).toContain('acme-lab/other/ledgerline');
  });
});

describe('a promote confirm is done only when its own commit heads the MR (F38)', () => {
  it('someone pushing to the branch between the commit and the MR fails the confirm', async () => {
    let fake: FakeGitLab | null = null;
    const branch = `belay/promote-qa.file-bug-${DAY}`;
    const pushedBetween = (port: GitLabPort): GitLabPort => new Proxy(port, {
      get: (t, k, r) => (k === 'execute'
        ? async (c: PlannedCommand) => {
          if (c.argv.includes('POST') && c.argv.some((a) => a.endsWith('/merge_requests'))) (named(fake!, 'belay-policy').branches ??= {})[branch] = LEFT;
          return t.execute(c);
        }
        : Reflect.get(t, k, r)),
    });
    const r0 = await rig(pushedBetween);
    fake = r0.gl;
    const r = await confirmIntent(r0.deps, PROMOTE, preview(await previewIntent(r0.deps, PROMOTE)).previewId);
    expect(r.status).toBe('failed');
    expect(r.status === 'failed' && r.results.at(-1)?.error).toMatch(/is headed by .* not .*the commit this confirm made/);
  });
});
