// `afterlife doctor`: local preflight, then real capability probes against AFTERLIFE_GROUP_ID.
// Run by cli/belay.mjs through tsx. Read-only: it only ever sends GETs. Exit 0, 2 or 3: doctor/render.ts.
import { messageOf } from '@/lib/format/error';
import { defaultExec, type ExecFn } from './adapter/exec';
import { createGlabAdapter } from './adapter/glabAdapter';
import { probeCapabilities } from './capabilities';
import { readConfig, resolveGlabBin } from './config';
import { doctorExitCode, localChecks, renderDoctor, row } from './doctor/render';

async function local(exec: ExecFn, bin: string, args: string[]): Promise<{ ok: boolean; out: string }> {
  try {
    const r = await exec(bin, args);
    const lines = `${r.stdout}\n${r.stderr}`.split('\n').map((l) => l.replace(/^\W+/, '').trim()).filter(Boolean);
    const text = lines.find((l) => /^Logged in/.test(l)) ?? lines[0] ?? '';
    return { ok: r.code === 0, out: text };
  } catch (e) {
    return { ok: false, out: messageOf(e) };
  }
}

async function main(): Promise<number> {
  const cfg = readConfig();
  const bin = await resolveGlabBin(cfg, defaultExec);
  const out: string[] = [];
  for (const [name, b, args] of localChecks(bin, cfg.host)) {
    const r = await local(defaultExec, b, args);
    out.push(row(r.ok ? 'available' : 'unavailable', name, r.out));
  }
  out.push(row('available', 'node', process.version));
  const port = createGlabAdapter({ bin, host: cfg.host, exec: defaultExec });
  const report = await probeCapabilities(port, cfg.groupId);
  const lines = renderDoctor(report, { local: out, groupId: cfg.groupId });
  // why each failed context read failed, just above the rows (a blocked report lists no rows)
  if (!report.blocker) lines.splice(lines.length - report.capabilities.length, 0, ...report.errors.map((x) => `could not read ${x.read}: ${x.kind}: ${x.message}`));
  console.log(lines.join('\n'));
  return doctorExitCode(report);
}

main().then((code) => { process.exitCode = code; }, (e: unknown) => { console.error(e); process.exitCode = 2; });
