// `belay doctor`: local preflight, then real capability probes against BELAY_GROUP_ID.
// Run by cli/belay.mjs through tsx. Read-only: it only ever sends GETs.
import { defaultExec, type ExecFn } from './adapter/exec';
import { createGlabAdapter } from './adapter/glabAdapter';
import { probeCapabilities, type Capability } from './capabilities';
import { readConfig, resolveGlabBin } from './config';

const row = (status: string, name: string, detail: string): string => `${status.padEnd(11)}  ${name.padEnd(36)} ${detail}`;

async function local(exec: ExecFn, bin: string, args: string[]): Promise<{ ok: boolean; out: string }> {
  try {
    const r = await exec(bin, args);
    const lines = `${r.stdout}\n${r.stderr}`.split('\n').map((l) => l.replace(/^\W+/, '').trim()).filter(Boolean);
    const text = lines.find((l) => /^Logged in/.test(l)) ?? lines[0] ?? '';
    return { ok: r.code === 0, out: text };
  } catch (e) {
    return { ok: false, out: e instanceof Error ? e.message : String(e) };
  }
}

const show = (c: Capability): string => row(c.status, c.label, `[${c.basis}] ${c.reason}`);

async function main(): Promise<number> {
  const cfg = readConfig();
  const bin = await resolveGlabBin(cfg, defaultExec);
  const out: string[] = [];
  for (const [name, b, args] of [['git', 'git', ['--version']], ['glab', bin, ['--version']], ['glab auth', bin, ['auth', 'status']]] as const) {
    const r = await local(defaultExec, b, [...args]);
    out.push(row(r.ok ? 'available' : 'unavailable', name, r.out));
  }
  out.push(row('available', 'node', process.version));
  const port = createGlabAdapter({ bin, host: cfg.host, exec: defaultExec });
  const user = await port.currentUser().then((u) => u.username, (e: Error) => `(${e.message})`);
  out.push(row(user.startsWith('(') ? 'unknown' : 'available', 'signed in as', user));
  const report = await probeCapabilities(port, cfg.groupId);
  const g = report.group;
  out.push('', `group ${cfg.groupId}: ${g ? `${g.fullPath} (${g.visibility})` : 'not readable'}`);
  out.push(`plan: ${report.plan ?? 'unknown'}${report.trial ? ' (trial)' : ''}   GitLab ${report.version ?? 'unknown'}   projects: ${report.projectCount ?? 'unknown'}`, '');
  out.push(...report.capabilities.map(show));
  console.log(out.join('\n'));
  return report.capabilities.every((c) => c.status === 'unknown') ? 2 : 0;
}

main().then((code) => { process.exitCode = code; }, (e: unknown) => { console.error(e); process.exitCode = 2; });
