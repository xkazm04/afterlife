import { describe, expect, it } from 'vitest';
import { createFakeGitLab } from '../fake/fakeGitLab';
import { verifyChain, type LedgerEvent } from '@/schemas/ledger';

const LEDGERLINE = 90010001;
const POLICY = 90010002;
const LEDGER = 90010003;

describe('fake GitLab: seeded reads', () => {
  const { port } = createFakeGitLab();

  it('lists the three demo projects', async () => {
    expect((await port.listProjects(144060371)).map((p) => p.name)).toEqual(['ledgerline', 'belay-policy', 'belay-ledger']);
  });

  it('reads pipelines (newest first, filtered), jobs, a failing trace and the test summary', async () => {
    expect((await port.listPipelines(LEDGERLINE)).map((p) => p.id)).toEqual([70003, 70002, 70001]);
    expect((await port.listPipelines(LEDGERLINE, { status: 'failed' })).map((p) => p.id)).toEqual([70002]);
    expect((await port.listJobs(LEDGERLINE, 70002)).map((j) => [j.name, j.status])).toContainEqual(['unit-tests', 'failed']);
    expect(await port.jobTrace(LEDGERLINE, 80002)).toContain('AssertionError');
    expect(await port.testReportSummary(LEDGERLINE, 70002)).toMatchObject({ count: 42, failed: 1, suites: [{ name: 'unit-tests', failed: 1 }] });
    expect(await port.testReportSummary(LEDGERLINE, 70003)).toBeNull();
  });

  it('reads merge requests with labels, notes and diffs', async () => {
    const merged = await port.listMergeRequests(LEDGERLINE, { state: 'merged' });
    expect(merged.map((m) => m.iid)).toEqual([7]);
    expect(merged[0]?.labels).toEqual(['proof::pass', 'guardrail::pass', 'belay::tier::supervised']);
    expect((await port.listMergeRequests(LEDGERLINE, { labels: ['proof::fail'] })).map((m) => m.iid)).toEqual([8]);
    expect((await port.listGroupMergeRequests(144060371)).map((m) => m.iid)).toEqual([8, 7]);
    expect((await port.listNotes(LEDGERLINE, 7))[0]?.body).toContain('```belay-proof');
    const diffs = await port.listDiffs(LEDGERLINE, 7);
    expect(diffs.map((d) => [d.newPath, d.added, d.removed])).toEqual([['package.json', 1, 1], ['package-lock.json', 1, 1]]);
  });

  it('reads environments, deployments, releases and schedules', async () => {
    expect((await port.listEnvironments(LEDGERLINE)).map((e) => e.name)).toContain('production');
    expect((await port.listDeployments(LEDGERLINE, { environment: 'production' })).map((d) => [d.id, d.status])).toEqual([[4003, 'blocked'], [4001, 'success']]);
    expect((await port.listReleases(LEDGERLINE))[0]?.tagName).toBe('v0.3.0');
    expect((await port.listSchedules(LEDGERLINE))[0]).toMatchObject({ id: 12, active: true });
  });

  it('reads repository files and trees, null for a missing file', async () => {
    const f = await port.getFile(POLICY, 'tier-state.yml', 'main');
    expect(f?.content).toContain('tier-state.yml - where each agent');
    expect(await port.getFile(POLICY, 'nope.yml', 'main')).toBeNull();
    expect((await port.listTree(LEDGER, { path: 'events' })).map((t) => t.path)).toEqual(['events/90010001.jsonl']);
    expect((await port.listTree(LEDGER)).map((t) => [t.name, t.type])).toEqual([['events', 'tree']]);
  });

  it('the seeded ledger file is a verifiable hash chain', async () => {
    const f = await port.getFile(LEDGER, 'events/90010001.jsonl', 'main');
    const chain = (f?.content ?? '').trim().split('\n').map((l) => JSON.parse(l) as LedgerEvent);
    expect(chain).toHaveLength(4);
    expect(verifyChain(chain)).toBeNull();
  });

  it('serves vulnerabilities only on Ultimate', async () => {
    expect(await port.listVulnerabilities(LEDGERLINE)).toMatchObject({ status: 'available', data: [{ severity: 'high' }, { severity: 'medium' }] });
    const free = createFakeGitLab({ plan: 'free' }).port;
    expect((await free.listVulnerabilities(LEDGERLINE)).status).toBe('unavailable');
  });

  it('filters pipelines by scope: a record with tag: true is a tag pipeline, one without is a branch pipeline', async () => {
    const fake = createFakeGitLab();
    const project = fake.state.projects.find((p) => p.raw.id === LEDGERLINE);
    const branch = project?.pipelines.find((p) => p.id === 70003);
    if (!project || !branch) throw new Error('demo pipeline 70003 missing');
    project.pipelines.push({ ...branch, id: 70004, tag: true });
    const ids = async (f: { scope?: 'branches' | 'tags' } = {}) => (await fake.port.listPipelines(LEDGERLINE, f)).map((p) => p.id);
    expect(await ids()).toEqual([70004, 70003, 70002, 70001]);
    expect(await ids({ scope: 'branches' })).toEqual([70003, 70002, 70001]);
    expect(await ids({ scope: 'tags' })).toEqual([70004]);
  });

  it('pages through lists with a small page size', async () => {
    const small = createFakeGitLab({ pageSize: 1 }).port;
    expect((await small.listPipelines(LEDGERLINE)).map((p) => p.id)).toEqual([70003, 70002, 70001]);
  });
});

describe('fake GitLab: planned writes change state only through execute', () => {
  it('building a command changes nothing; executing it does', async () => {
    const { port, state } = createFakeGitLab();
    const planned = port.plan.createMr({ project: LEDGERLINE, sourceBranch: 'belay/new', targetBranch: 'main', title: 'New', labels: ['proof::pass'] });
    expect(state.writes).toEqual([]);
    await port.execute(planned);
    const mrs = await port.listMergeRequests(LEDGERLINE, { state: 'opened' });
    expect(mrs.map((m) => [m.iid, m.title, m.author, m.labels])).toContainEqual([9, 'New', 'kazdanm', ['proof::pass']]);
    expect(state.writes).toHaveLength(1);
  });

  it('adds a note, swaps labels, commits a policy file', async () => {
    const { port } = createFakeGitLab();
    await port.execute(port.plan.addNote({ project: LEDGERLINE, iid: 8, body: 'hello' }));
    expect((await port.listNotes(LEDGERLINE, 8)).map((n) => n.body)).toEqual(['hello']);
    await port.execute(port.plan.setLabels({ project: LEDGERLINE, iid: 8, add: ['proof::pass'], remove: ['proof::fail'] }));
    expect((await port.listMergeRequests(LEDGERLINE, { state: 'opened' }))[0]?.labels).toEqual(['proof::pass']);
    await port.execute(port.plan.commitFile({ project: POLICY, path: 'tier-state.yml', branch: 'main', content: 'version: 1\n', message: 'demote', action: 'update' }));
    expect((await port.getFile(POLICY, 'tier-state.yml', 'main'))?.content).toBe('version: 1\n');
  });

  it('refuses to create a file that exists and to update one that does not', async () => {
    const { port } = createFakeGitLab();
    const base = { project: POLICY, branch: 'main', content: 'x', message: 'm' };
    await expect(port.execute(port.plan.commitFile({ ...base, path: 'tier-state.yml', action: 'create' }))).rejects.toMatchObject({ kind: 'api', status: 400 });
    await expect(port.execute(port.plan.commitFile({ ...base, path: 'new.yml', action: 'update' }))).rejects.toMatchObject({ kind: 'api', status: 400 });
  });

  it('pauses a schedule', async () => {
    const { port } = createFakeGitLab();
    await port.execute(port.plan.pauseSchedule({ project: LEDGERLINE, scheduleId: 12 }));
    expect((await port.listSchedules(LEDGERLINE))[0]?.active).toBe(false);
  });

  it('approves a deployment on Premium+, forbidden on Free', async () => {
    const ultimate = createFakeGitLab();
    await ultimate.port.execute(ultimate.port.plan.approveDeployment({ project: LEDGERLINE, deploymentId: 4003, status: 'approved' }));
    expect((await ultimate.port.listDeployments(LEDGERLINE, { status: 'running' })).map((d) => d.id)).toEqual([4003]);
    const free = createFakeGitLab({ plan: 'free' });
    await expect(free.port.execute(free.port.plan.approveDeployment({ project: LEDGERLINE, deploymentId: 4003, status: 'approved' }))).rejects.toMatchObject({ kind: 'forbidden' });
  });

  it('seeds are independent per instance', async () => {
    const a = createFakeGitLab();
    await a.port.execute(a.port.plan.pauseSchedule({ project: LEDGERLINE, scheduleId: 12 }));
    expect((await createFakeGitLab().port.listSchedules(LEDGERLINE))[0]?.active).toBe(true);
  });

  it('unknown project is not-found', async () => {
    await expect(createFakeGitLab().port.listPipelines(123)).rejects.toMatchObject({ kind: 'not-found' });
  });
});
