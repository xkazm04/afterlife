// Step 9 against the fake GitLab: its commands run as written on projects whose main GitLab already protects, and its
// read-back is done only when every setting it lists reads back as listed.
import { describe, expect, it } from 'vitest';
import { stepDetailsFor, type StepNames } from '@/app/features/setup/data/stepDetail';
import { createDemoGitLab, GROUP_ID } from '@/server/gitlab/fake/demo';
import type { FakeGitLab } from '@/server/gitlab/fake/fakeGitLab';
import { createBelayProjects, projectNamed } from '@/server/gitlab/fake/setupDone';
import type { StepCtx } from './ctx';
import { covers, protectionsRead } from './protections';
import { BELAY_PROJECTS } from './read';

const NAMES: StepNames = { host: 'gitlab.com', group: 'acme-lab', project: 'afterlife', projects: ['afterlife', ...BELAY_PROJECTS] };
const COMMANDS = stepDetailsFor(NAMES)[9]?.cmd ?? [];

/** A shell line as argv: words split on spaces, single quotes kept together and dropped. */
const argv = (line: string): string[] => (line.match(/'[^']*'|\S+/g) ?? []).map((w) => w.replace(/^'(.*)'$/, '$1'));

/** The demo group with a root-level target and the belay projects, main protected on each as GitLab does by default. */
function group(plan: 'ultimate' | 'free' = 'ultimate'): FakeGitLab {
  const gl = createDemoGitLab(undefined, { plan });
  for (const p of [projectNamed(gl, 'afterlife'), ...createBelayProjects(gl)]) {
    p.protectedBranches = { main: { name: 'main', push_access_levels: [{ access_level: 40 }], merge_access_levels: [{ access_level: 40 }], allow_force_push: false, code_owner_approval_required: false } };
  }
  return gl;
}

async function ctx(gl: FakeGitLab): Promise<StepCtx> {
  const all = await gl.port.listProjects(GROUP_ID);
  return { port: gl.port, groupId: GROUP_ID, group: 'acme-lab', project: 'afterlife', today: '2026-10-08', listing: { ok: true, all, target: all.find((p) => p.path === 'afterlife') ?? null } };
}

/** Runs each line, in order, against the fake's `glab api`, as a person would paste them. */
async function run(gl: FakeGitLab, lines: readonly string[]): Promise<{ line: string; code: number }[]> {
  const out: { line: string; code: number }[] = [];
  for (const line of lines) out.push({ line, code: (await gl.exec('glab', argv(line).slice(1))).code });
  return out;
}

/** What step 9 leaves that its commands do not set: CODEOWNERS (by MR), author-cannot-approve, the allowlists. */
function settleTheRest(gl: FakeGitLab): void {
  const apply = Number(projectNamed(gl, 'belay-apply').raw.id);
  const target = projectNamed(gl, 'afterlife');
  target.files['.gitlab/CODEOWNERS'] = '# CI and agent config\n/.gitlab-ci.yml @acme/belay-owners\n/.gitlab/ @acme/belay-owners\n';
  target.approvalSettings = { merge_requests_author_approval: false };
  for (const p of ['belay-engine', 'belay-policy']) projectNamed(gl, p).jobTokenAllowlist = [apply];
}

describe("step 9's commands run as written where GitLab already protects main (craft-1, robustness-1)", () => {
  it('a bare POST for a protected main answers 409; the commands read first, then DELETE and POST, and every one exits 0 but a DELETE of nothing', async () => {
    const gl = group();
    const bare = await run(gl, ['glab api --method POST projects/acme-lab%2Fbelay-apply/protected_branches -f name=main -f push_access_level=0']);
    expect(bare[0]?.code).toBe(1);
    const ran = await run(gl, COMMANDS);
    expect(ran.filter((r) => r.code !== 0).map((r) => r.line)).toEqual(COMMANDS.filter((c) => /DELETE .*(belay%2F\*|v\*)'?$/.test(c)));
    for (const [i, c] of COMMANDS.entries()) {
      const m = /--method POST (projects\/\S+\/protected_(?:branches|tags))/.exec(c);
      if (!m) continue;
      expect(COMMANDS.slice(0, i), c).toContain(`glab api ${m[1]}`);
      expect(COMMANDS[i - 1], c).toMatch(/^glab api --method DELETE /);
    }
    expect(COMMANDS.join('\n')).not.toContain(':id');
  });

  it('read back: failed naming each setting that differs, then done once every one reads back as listed', async () => {
    const gl = group();
    const before = await protectionsRead(await ctx(gl));
    expect(before.state).toBe('failed');
    const text = before.state === 'failed' ? before.text : '';
    for (const want of ["belay-apply's main: push is not No one, Code Owner approval is off", 'belay/* on the target: not protected', 'v* tags of belay-engine: not protected', 'the target has no CODEOWNERS on main', 'authors can approve', 'belay-apply is not on belay-policy']) expect(text).toContain(want);
    await run(gl, COMMANDS);
    settleTheRest(gl);
    expect(await protectionsRead(await ctx(gl))).toEqual({ state: 'done', text: expect.stringMatching(/^10 of 10 settings read back as listed: /) });
    projectNamed(gl, 'belay-ledger').protectedBranches!.main!.push_access_levels = [{ access_level: 30 }];
    expect(await protectionsRead(await ctx(gl))).toEqual({ state: 'failed', text: "belay-ledger's main: Developers are allowed" });
  });

  it('force push on, on the target’s main, on belay/* or on belay-ledger’s main, reads failed and names the setting (robustness-q4a)', async () => {
    const gl = group();
    await run(gl, COMMANDS);
    settleTheRest(gl);
    expect(await protectionsRead(await ctx(gl))).toMatchObject({ state: 'done' });
    for (const [name, branch, what] of [['afterlife', 'main', 'the target’s main'], ['afterlife', 'belay/*', 'belay/* on the target'], ['belay-ledger', 'main', "belay-ledger's main"]] as const) {
      const rules = projectNamed(gl, name).protectedBranches!;
      rules[branch]!.allow_force_push = true;
      expect(await protectionsRead(await ctx(gl))).toEqual({ state: 'failed', text: `${what}: force push is allowed` });
      rules[branch]!.allow_force_push = false;
    }
  });

  it('a setting that cannot be read is unknown, with the reason, when nothing differs; a missing project fails', async () => {
    const gl = group('free');
    await run(gl, COMMANDS);
    settleTheRest(gl);
    expect(await protectionsRead(await ctx(gl))).toEqual({ state: 'unknown', reason: expect.stringMatching(/^9 of 10 settings read back as listed · not read: author cannot approve on the target \(forbidden: /) });
    const c = await ctx(gl);
    const noApply = { ...c, listing: { ok: true as const, target: c.listing.ok ? c.listing.target : null, all: c.listing.ok ? c.listing.all.filter((p) => p.path !== 'belay-apply') : [] } };
    expect(await protectionsRead(noApply)).toEqual({ state: 'failed', text: expect.stringMatching(/^belay-apply does not exist in acme-lab \(step 4\)/) });
    expect(await protectionsRead({ ...c, listing: { ok: false, reason: 'listing failed: network' } })).toEqual({ state: 'unknown', reason: 'reading the protections failed: listing failed: network' });
  });

  it('CODEOWNERS covers a path by the path, rooted or not, or its folder with a trailing glob; comments and sections do not', () => {
    for (const f of ['/.gitlab-ci.yml @a', '.gitlab-ci.yml @a']) expect(covers(f, '.gitlab-ci.yml')).toBe(true);
    for (const f of ['/.gitlab/ @a', '.gitlab/** @a', '/.gitlab/* @a']) expect(covers(f, '.gitlab/')).toBe(true);
    for (const f of ['# /.gitlab-ci.yml @a', '[CI] @a', '/src/ @a']) expect(covers(f, '.gitlab-ci.yml')).toBe(false);
  });
});

describe("step 9's and step 5's target commands on a target in a subgroup (craft-1)", () => {
  const SUB = 'acme-lab/core-banking/ledgerline';
  async function subgroupNames(gl: FakeGitLab): Promise<StepNames> {
    const all = await gl.port.listProjects(GROUP_ID);
    const target = all.find((p) => p.path === 'ledgerline');
    return { host: 'gitlab.com', group: 'acme-lab', project: 'ledgerline', path: target?.pathWithNamespace, projects: ['ledgerline', ...BELAY_PROJECTS] };
  }

  it('names the full path in the five target lines and the push; the belay-* lines stay at the group’s root', async () => {
    const gl = createDemoGitLab();
    createBelayProjects(gl);
    const names = await subgroupNames(gl);
    expect(names.path).toBe(SUB);
    const d = stepDetailsFor(names);
    const target = (d[9]?.cmd ?? []).filter((c) => c.includes(encodeURIComponent(SUB)));
    expect(target).toHaveLength(5);
    expect(d[5]?.cmd).toEqual([`git -C ../ledgerline push --mirror https://gitlab.com/${SUB}.git`]);
    expect((d[9]?.cmd ?? []).some((c) => c.includes('acme-lab%2Fbelay-apply/protected_branches'))).toBe(true);
    expect((d[9]?.cmd ?? []).join('\n')).not.toContain('acme-lab%2Fledgerline');
  });

  it('the target lines run against the fake: none answers 404', async () => {
    const gl = createDemoGitLab();
    createBelayProjects(gl);
    const rule = { push_access_levels: [{ access_level: 40 }], merge_access_levels: [{ access_level: 40 }], allow_force_push: false, code_owner_approval_required: false };
    projectNamed(gl, 'ledgerline').protectedBranches = { main: { name: 'main', ...rule }, 'belay/*': { name: 'belay/*', ...rule } };
    const lines = (stepDetailsFor(await subgroupNames(gl))[9]?.cmd ?? []).filter((c) => c.includes(encodeURIComponent(SUB)));
    const ran = await run(gl, lines);
    expect(ran.map((r) => r.code)).toEqual([0, 0, 0, 0, 0]);
    const bare = await run(gl, ['glab api projects/acme-lab%2Fledgerline/protected_branches']);
    expect(bare[0]?.code).not.toBe(0);
  });
});
