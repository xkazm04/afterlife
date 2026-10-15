// What `belay doctor` prints and the code it exits with. A blocker comes first, with its fix on the next line, and stands
// in for the rows it blocked; otherwise the login, the group and one row per capability.
// Exit codes: 0 the probes answered, 2 every capability unknown with no blocker named, 3 blocked (see doctor/blocker.ts).
import type { Capability, DoctorReport } from '../capabilities';

export const row = (status: string, name: string, detail: string): string => `${status.padEnd(11)}  ${name.padEnd(36)} ${detail}`;
const show = (c: Capability): string => row(c.status, c.label, `[${c.basis}] ${c.reason}`);

export interface RenderOpts {
  /** The local preflight rows (git, glab, glab auth, node), printed first as they are. */
  local: readonly string[];
  groupId: string | number;
}

export function renderDoctor(report: DoctorReport, o: RenderOpts): string[] {
  const out = [...o.local];
  const b = report.blocker;
  if (b) {
    out.push(`BLOCKED  ${b.text}`, `  fix: ${b.fix}`, '');
    out.push(`${report.capabilities.length} capabilities not probed until this is fixed: run belay doctor again after.`);
    return out;
  }
  out.push(row(report.user ? 'available' : 'unknown', 'signed in as', report.user ?? '(the user read failed)'));
  const g = report.group;
  out.push('', `group ${o.groupId}: ${g ? `${g.fullPath} (${g.visibility})` : 'not readable'}`);
  out.push(`plan: ${report.plan ?? 'unknown'}${report.trial ? ' (trial)' : ''}   GitLab ${report.version ?? 'unknown'}   projects: ${report.projectCount ?? 'unknown'}`, '');
  out.push(...report.capabilities.map(show));
  return out;
}

export function doctorExitCode(report: DoctorReport): 0 | 2 | 3 {
  if (report.blocker) return 3;
  return report.capabilities.every((c) => c.status === 'unknown') ? 2 : 0;
}
