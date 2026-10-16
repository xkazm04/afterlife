// The doctor diagnoses before it lists: when the binary, the network, the login or the group is wrong, it names that one
// blocker and the command that fixes it, instead of eleven rows that each failed the same way.
import { describe, expect, it } from 'vitest';
import { setupReads } from '@/server/data/setup/read';
import type { ExecFn } from '../../adapter/exec';
import { createGlabAdapter } from '../../adapter/glabAdapter';
import { probeCapabilities } from '../../capabilities';
import { doctorExitCode, renderDoctor } from '../../doctor/render';
import { GitLabError } from '../../errors';
import { createFakeGitLab } from '../../fake/fakeGitLab';

const GROUP = 144060371;
const failing = (stderr: string, host?: string) =>
  createGlabAdapter({ bin: 'glab', host, exec: async () => ({ code: 1, stdout: '', stderr }), sleep: async () => undefined });
const UNAUTHORIZED = 'glab: 401 Unauthorized (HTTP 401)';
const LOCAL = ['available    git', 'available    glab'];

describe('probeCapabilities names the one blocker', () => {
  it('401 on every call: auth, fix glab auth login, every row blocked by it', async () => {
    const r = await probeCapabilities(failing(UNAUTHORIZED), GROUP);
    expect(r.blocker).toMatchObject({ kind: 'auth', fix: 'glab auth login' });
    expect(r.capabilities).toHaveLength(11);
    for (const c of r.capabilities) {
      expect(c).toMatchObject({ status: 'unknown', basis: 'none' });
      expect(c.reason.startsWith('blocked by: glab is not logged in')).toBe(true);
    }
  });

  it('401 on a self-managed host: the fix names the host', async () => {
    const r = await probeCapabilities(failing(UNAUTHORIZED, 'gitlab.example.com'), GROUP);
    expect(r.blocker?.fix).toBe('glab auth login --hostname gitlab.example.com');
  });

  it('glab cannot start: binary, the fix names BELAY_GLAB and the install command', async () => {
    const exec: ExecFn = async (file) => { throw new GitLabError('binary', `cannot start ${file}: ENOENT`, file); };
    const r = await probeCapabilities(createGlabAdapter({ bin: 'glab', exec }), GROUP);
    expect(r.blocker?.kind).toBe('binary');
    expect(r.blocker?.fix).toContain('BELAY_GLAB');
    expect(r.blocker?.fix).toMatch(/winget install GLab\.GLab/);
  });

  it('no such host: network, and the text names the host', async () => {
    const r = await probeCapabilities(failing('dial tcp: lookup gitlab.example.com: no such host', 'gitlab.example.com'), GROUP);
    expect(r.blocker?.kind).toBe('network');
    expect(r.blocker?.text).toContain('gitlab.example.com');
  });

  it('signed in, but the group answers 404: group, the text names the id, the fix names BELAY_GROUP_ID', async () => {
    const fake = createFakeGitLab({ plan: 'free' });
    const exec: ExecFn = async (file, args) =>
      args.some((a) => /^groups\/999(\?|$)/.test(a)) ? { code: 1, stdout: '', stderr: 'glab: 404 Not Found (HTTP 404)' } : fake.exec(file, args);
    const r = await probeCapabilities(createGlabAdapter({ bin: 'glab', exec }), 999);
    expect(r.blocker?.kind).toBe('group');
    expect(r.blocker?.text).toContain('999');
    expect(r.blocker?.fix).toContain('BELAY_GROUP_ID');
    // The rows ran past an unreadable group, so the doctor prints them and does not call them unprobed.
    const lines = renderDoctor(r, { local: LOCAL, groupId: 999 });
    expect(lines[LOCAL.length]?.startsWith('BLOCKED  group 999')).toBe(true);
    expect(lines.some((l) => l.includes('not probed'))).toBe(false);
    for (const c of r.capabilities) expect(lines.some((l) => l.includes(c.label))).toBe(true);
  });

  it('a healthy Free group: no blocker, and the rows are the rows the doctor printed before', async () => {
    const r = await probeCapabilities(createFakeGitLab({ plan: 'free' }).port, GROUP);
    expect(r.blocker).toBeNull();
    expect(r.capabilities.map((c) => [c.id, c.status, c.basis, c.reason])).toEqual([
      ['pipelines', 'available', 'endpoint', 'GET projects/90010001/pipelines?per_page=1 answered 200'],
      ['merge_requests', 'available', 'endpoint', `GET groups/${GROUP}/merge_requests?per_page=1 answered 200`],
      ['releases', 'available', 'endpoint', `GET groups/${GROUP}/releases?per_page=1 answered 200`],
      ['ci_components', 'available', 'version', 'CI/CD components are GA from 17.0 on every tier; instance runs 19.5.0-pre'],
      ['security_reports', 'unavailable', 'plan', 'security report views needs ultimate; this namespace is on free. Start the trial or upgrade'],
      ['custom_flows', 'unknown', 'none', 'no REST read endpoint (GraphQL only); the doctor sends only GETs'],
      ['flows_api', 'unavailable', 'endpoint', 'GET ai/duo_workflows/workflows -> 404 (glab: 404 Not Found (HTTP 404)); 404 may also mean this list route does not exist; confirm on the trial'],
      ['service_accounts', 'available', 'endpoint', `GET groups/${GROUP}/service_accounts?per_page=1 answered 200`],
      ['deployment_approvals', 'unavailable', 'plan', 'deployment approval rules needs premium; this namespace is on free. Start the trial or upgrade'],
      ['vulnerability_api', 'unavailable', 'endpoint', 'GET projects/90010001/vulnerabilities?per_page=1 -> 403 (glab: 403 Forbidden (HTTP 403))'],
      ['audit_events', 'unavailable', 'endpoint', `GET groups/${GROUP}/audit_events?per_page=1 -> 403 (glab: 403 Forbidden (HTTP 403))`],
    ]);
    expect(doctorExitCode(r)).toBe(0);
  });

  it('a 500 on every call is not a blocker: no cause is guessed, the rows say unknown, exit 2', async () => {
    const r = await probeCapabilities(failing('glab: 500 Internal Server Error (HTTP 500)'), GROUP);
    expect(r.blocker).toBeNull();
    expect(r.capabilities.every((c) => c.status === 'unknown')).toBe(true);
    expect(doctorExitCode(r)).toBe(2);
  });
});

describe('the CLI and Setup print the blocker, not the cascade', () => {
  it('renderDoctor: BLOCKED first, the fix second, no per-row failure; exit code 3', async () => {
    const r = await probeCapabilities(failing(UNAUTHORIZED), GROUP);
    const lines = renderDoctor(r, { local: LOCAL, groupId: GROUP });
    expect(lines.slice(0, LOCAL.length)).toEqual(LOCAL);
    const [first, second] = lines.slice(LOCAL.length);
    expect(first?.startsWith('BLOCKED  glab is not logged in')).toBe(true);
    expect(second).toContain('glab auth login');
    expect(lines.filter((l) => /failed \(auth: /.test(l))).toEqual([]);
    expect(doctorExitCode(r)).toBe(3);
  });

  it("Setup's doctor read puts the blocker and its fix in the error slot", async () => {
    const reads = setupReads({ port: failing(UNAUTHORIZED), groupId: GROUP, gitlabId: () => Promise.resolve(null) }, null, 'ledgerline');
    expect(await reads.doctor()).toMatchObject({ rows: [], error: 'glab is not logged in to gitlab.com: run glab auth login' });
  });
});
