// Enroll T4 against the fake GitLab (the demo group): arm and verify the track, then its one class, guard.block, gets
// its first record at start_tier through a belay::promotion MR a person merges. The demo's tier-state.yml already holds
// guard.block, so each test first takes the guardrail's records out: the group as it stands right after arming.
import { parse, parseDocument } from 'yaml';
import { describe, expect, it } from 'vitest';
import { promotion } from '@/lib/promotion';
import type { ProofBlock } from '@/schemas/proof';
import { rulesOf } from '@/server/data/policy';
import { getActionClasses } from '@/server/index/views/actionClasses';
import { runPollCycle } from '@/server/poller/cycle';
import { gate } from '../../../../../../engine/decide/gate';
import { parsePolicy, parseState } from '../../../../../../engine/policy/load';
import { liveRig, policyFiles, type ActionRig } from '../../../__tests__/rig';
import { removeBlock } from '../../../arm/block';
import { DEMO_PIN } from '../../../arm/config';
import { armOf } from '../../../arm/content';
import { checkArm } from '../../../arm/read';
import { confirmIntent, previewIntent, type ActionDeps } from '../../../run';
import type { ActionResponse } from '../../../types';
import { SEED_NOW } from '@/server/index/seed';

const ENROLL = { kind: 'enroll-track', project: 'ledgerline', track: 'T4' } as const;
const GUARDRAIL = 'ai-guardrail-acme-lab';
const ledgerline = (r: ActionRig) => r.gl.state.projects.find((p) => p.raw.name === 'ledgerline')!;
const policyMrs = (r: ActionRig) => r.gl.state.projects.find((p) => p.raw.name === 'belay-policy')!.mrs;

function preview(r: ActionResponse) {
  if (r.status !== 'preview') throw new Error(`expected a preview, got ${r.status}: ${'reason' in r ? r.reason : ''}`);
  return r.preview;
}
const reason = (r: ActionResponse) => (r.status === 'refused' ? r.reason : `not refused: ${r.status}`);

/** The demo group with T4 armed and verified, and no record for guard.block (the guardrail's account taken out). */
async function armedT4(): Promise<ActionRig & { deps: ActionDeps }> {
  const r = await liveRig();
  const plain = removeBlock(ledgerline(r).files['.gitlab-ci.yml']!, armOf('T4')!);
  if (!plain.ok) throw new Error('the demo file has no T4 block');
  ledgerline(r).files['.gitlab-ci.yml'] = plain.content;
  const deps = { ...r.deps, arm: { ok: true, pin: DEMO_PIN } } as ActionDeps;
  const arm = { kind: 'arm-track', project: 'ledgerline', track: 'T4' } as const;
  const p = preview(await previewIntent(deps, arm));
  expect((await confirmIntent(deps, arm, p.previewId)).status).toBe('done');
  ledgerline(r).mrs.find((m) => m.source_branch === p.branch)!.state = 'merged';
  expect(await checkArm(deps, arm)).toMatchObject({ status: 'read', armed: true });
  const doc = parseDocument(policyFiles(r.gl)['tier-state.yml']!);
  doc.deleteIn(['agents', GUARDRAIL]);
  policyFiles(r.gl)['tier-state.yml'] = doc.toString({ lineWidth: 0 });
  await runPollCycle(deps.port, r.db, SEED_NOW, { cfg: deps.cfg });
  return { ...r, deps };
}

const guardBlock = async (r: ActionRig) => (await getActionClasses(r.db, 'ledgerline', SEED_NOW)).find((c) => c.id === 'guard.block')!;
const policyNow = (r: ActionRig) => ({ policy: parsePolicy(parse(policyFiles(r.gl)['trust-policy.yml']!)), state: parseState(parse(policyFiles(r.gl)['tier-state.yml']!)) });
const CITED: ProofBlock = {
  schema: 'belay.proof/1', id: 'X', class: 'cited-diff', task: { flow: 'guardrail', run_id: 'r', project_id: 1, trailer: 't' },
  claims: [], checks: [{ claim_id: null, name: 'c', ok: true, detail: '' }], evidence: [], verdict: 'pass',
  envelope: { files: 1, lines: 2, paths_touched: ['a.kt'], within: true }, engine: { version: '1.0.0', sha256: 'abc' },
};
const gateNow = (r: ActionRig) => gate({ ...policyNow(r), classId: 'guard.block', agent: GUARDRAIL, proof: CITED, guardrail: { verdict: 'pass' }, now: SEED_NOW });

describe('enroll-track T4', () => {
  it('previews guard.block at start_tier under the guardrail account, opens a belay::promotion MR, and the merge moves the gate', async () => {
    const r = await armedT4();
    expect(await guardBlock(r)).toMatchObject({ cell: 'no_record' });
    expect(gateNow(r)).toMatchObject({ decision: 'block', reasons: [expect.stringContaining('no tier record')] });

    const p = preview(await previewIntent(r.deps, ENROLL));
    expect(p).toMatchObject({ kind: 'enroll-track', branch: 'belay/enroll-T4-2026-10-06', title: "Enroll T4's classes at assisted" });
    expect(p.diff).toEqual([`+   ${GUARDRAIL}:`, expect.stringMatching(/^\+ {5}guard\.block: \{ tier: assisted, since: "2026-10-06T\d\d:\d\d:00\.000Z", by: operator \S+ via enrollment MR \}$/)]);
    expect(p.notes?.[0]).toBe(`The account, ${GUARDRAIL}, is read from ledgerline's merge requests: Belay never invents one.`);
    const [commit, mr] = p.commands.map((c) => c.argv.join(' '));
    expect(commit).toContain('-f branch=belay/enroll-T4-2026-10-06');
    expect(commit).toContain('-f start_branch=main');
    expect(commit).toMatch(/-f last_commit_id=[0-9a-f]{40}/);
    expect(mr).toContain('-f labels=belay::promotion');
    expect(mr).toContain('A person merges this; Belay never does.');
    expect(r.gl.state.writes).toHaveLength(2); // the arm's two; the preview wrote nothing

    const done = await confirmIntent(r.deps, ENROLL, p.previewId);
    expect(done.status === 'done' && done.results.map((x) => x.made)).toEqual([expect.stringMatching(/^commit [0-9a-f]{8}$/), expect.stringMatching(/^!\d+$/)]);
    const opened = policyMrs(r).find((m) => m.source_branch === p.branch)!;
    expect(opened).toMatchObject({ state: 'opened', labels: ['belay::promotion'] }); // Belay never merges

    opened.state = 'merged'; // the fake has one branch: the person's merge is the MR's state
    await runPollCycle(r.deps.port, r.db, SEED_NOW, { cfg: r.deps.cfg });
    const after = await guardBlock(r);
    expect(after).toMatchObject({ tier: 'assisted' });
    expect(after.cell).toBeUndefined();
    const rules = rulesOf(policyNow(r).policy);
    expect(after.record).toMatchObject({ accepted: 0 }); // the poll counted the new record: none accepted since
    const promo = promotion({ ...after, tier: after.tier ?? 'quarantined' }, 'cited-diff', rules, SEED_NOW); // tier: assisted, above
    expect(promo.kind === 'notyet' && promo.rules.find((x) => x.name.startsWith('accepted'))?.value).toBe('0 / 5');
    expect(gateNow(r)).toMatchObject({ decision: 'wait', tier: 'assisted', reasons: ['assisted: a Code Owner approves and merges, the gate does not act'] });
  });

  it('refuses a track whose class already holds a record: enrollment is the first rung only', async () => {
    const r = await liveRig();
    expect(reason(await previewIntent(r.deps, ENROLL))).toBe(`T4 is already enrolled: guard.block (${GUARDRAIL} hands_off) holds a record. Enrollment writes first records only; promotion takes it from there`);
  });

  it('refuses when no account for the role can be found, and says where to set it', async () => {
    const r = await armedT4();
    for (const k of Object.keys(ledgerline(r).notes)) ledgerline(r).notes[k] = []; // no guardrail note acted here
    const why = reason(await previewIntent(r.deps, ENROLL));
    expect(why).toMatch(/^Belay could not find the guardrail agent's account: tier-state\.yml names no account with "guardrail" in it/);
    expect(why).toContain('BELAY_GUARDRAIL_AUTHORS');
  });

  it('a configured guardrail author is the account; two of them is a refusal, never a pick', async () => {
    const r = await armedT4();
    const withNames = (names: string[]) => ({ ...r.deps, cfg: { ...r.deps.cfg, guardrail: { ...r.deps.cfg.guardrail, names } } });
    expect(preview(await previewIntent(withNames(['ai-guardrail-ops']), ENROLL)).diff[0]).toBe('+   ai-guardrail-ops:');
    expect(reason(await previewIntent(withNames(['a-guard', 'b-guard']), ENROLL))).toContain("the poller's config names several accounts for the guardrail role (a-guard, b-guard)");
  });

  it('a stale preview id is answered changed, and nothing runs', async () => {
    const r = await armedT4();
    const p = preview(await previewIntent(r.deps, ENROLL));
    policyFiles(r.gl)['tier-state.yml'] += '# moved\n';
    const later = { ...r.deps, now: () => new Date(SEED_NOW.getTime() + 60_000) };
    const res = await confirmIntent(later, ENROLL, p.previewId);
    expect(res.status).toBe('changed');
    expect(policyMrs(r).some((m) => m.source_branch === p.branch)).toBe(false);
  });

  it('refuses when start_tier is missing, or belay-policy cannot be read', async () => {
    const r = await armedT4();
    const files = policyFiles(r.gl);
    const policy = files['trust-policy.yml']!;
    files['trust-policy.yml'] = policy.replace(/^start_tier: .*\n/m, '');
    expect(reason(await previewIntent(r.deps, ENROLL))).toMatch(/^trust-policy\.yml has no start_tier/);
    files['trust-policy.yml'] = policy;
    delete files['tier-state.yml'];
    expect(reason(await previewIntent(r.deps, ENROLL))).toMatch(/^Belay could not read belay-policy: tier-state\.yml is not in belay-policy/);
  });
});
