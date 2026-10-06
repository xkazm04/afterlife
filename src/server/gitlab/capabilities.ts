// `belay doctor` capability probes. Each capability is available, unavailable or unknown, and never
// guessed: an endpoint answering 403/404 is "unavailable" with the reason; a network, auth or
// rate-limit failure is "unknown"; a capability with no safe read endpoint is decided by the plan
// (marked basis "plan") or stays unknown.
import { GitLabError } from './errors';
import type { GitLabPort } from './port';
import type { GlGroup, ProjectRef } from './types';

export type CapabilityStatus = 'available' | 'unavailable' | 'unknown';
export type Basis = 'endpoint' | 'plan' | 'version' | 'none';
export type PlanName = 'free' | 'premium' | 'ultimate';

export interface Capability { id: string; label: string; status: CapabilityStatus; basis: Basis; reason: string }
export interface DoctorReport {
  group: GlGroup | null; plan: string | null; trial: boolean; version: string | null;
  projectCount: number | null; capabilities: Capability[];
}

type Verdict = Pick<Capability, 'status' | 'basis' | 'reason'>;
const RANK: Record<PlanName, number> = { free: 0, premium: 1, ultimate: 2 };

/** "ultimate_trial" -> ultimate; legacy gold/silver/bronze -> ultimate/premium; unrecognised -> null. */
export function planName(raw: string | null): PlanName | null {
  const p = (raw ?? '').toLowerCase().replace(/_trial$/, '');
  if (p === 'free' || p === 'premium' || p === 'ultimate') return p;
  if (p === 'gold') return 'ultimate';
  if (p === 'silver' || p === 'bronze') return 'premium';
  return null;
}

/** Turns the outcome of one GET into a verdict. 403/404 = unavailable; anything else failing = unknown. */
export function classifyEndpoint(endpoint: string, error: unknown | null, note = ''): Verdict {
  if (error === null) return { status: 'available', basis: 'endpoint', reason: `GET ${endpoint} answered 200` };
  if (error instanceof GitLabError && (error.kind === 'forbidden' || error.kind === 'not-found')) {
    return { status: 'unavailable', basis: 'endpoint', reason: `GET ${endpoint} -> ${error.status} (${error.message})${note ? `; ${note}` : ''}` };
  }
  const why = error instanceof GitLabError ? `${error.kind}: ${error.message}` : String(error);
  return { status: 'unknown', basis: 'endpoint', reason: `GET ${endpoint} failed (${why}); not a verdict on the plan` };
}

/** Plan-gated capability with no safe read endpoint: the documented tier decides. */
export function classifyPlan(plan: PlanName | null, needs: PlanName, what: string): Verdict {
  if (plan === null) return { status: 'unknown', basis: 'plan', reason: 'the namespace plan could not be read' };
  const meets = RANK[plan] >= RANK[needs];
  return {
    status: meets ? 'available' : 'unavailable', basis: 'plan',
    reason: `${what} needs ${needs}; this namespace is on ${plan}${meets ? '' : '. Start the trial or upgrade'}`,
  };
}

/** CI/CD components are GA from 17.0 on every tier, so the instance version decides. */
export function classifyComponents(version: string | null): Verdict {
  const major = Number(/^(\d+)\./.exec(version ?? '')?.[1]);
  if (!Number.isFinite(major)) return { status: 'unknown', basis: 'version', reason: 'the instance version could not be read' };
  return {
    status: major >= 17 ? 'available' : 'unavailable', basis: 'version',
    reason: `CI/CD components are GA from 17.0 on every tier; instance runs ${version}`,
  };
}

async function get(port: GitLabPort, endpoint: string, note?: string): Promise<Verdict> {
  const [path = endpoint, qs = ''] = endpoint.split('?');
  try {
    await port.get(path, Object.fromEntries(new URLSearchParams(qs)));
    return classifyEndpoint(endpoint, null);
  } catch (e) {
    return classifyEndpoint(endpoint, e, note);
  }
}

const attempt = async <T>(f: () => Promise<T>): Promise<T | null> => {
  try { return await f(); } catch { return null; }
};

export async function probeCapabilities(port: GitLabPort, group: ProjectRef): Promise<DoctorReport> {
  const [grp, ns, inst, projects] = await Promise.all([
    attempt(() => port.getGroup(group)), attempt(() => port.getNamespace(group)),
    attempt(() => port.instance()), attempt(() => port.listProjects(group)),
  ]);
  const plan = planName(ns?.plan ?? null);
  const project = projects?.[0]?.id ?? null;
  const g = `groups/${encodeURIComponent(String(group))}`;
  const noProject = (): Verdict => ({ status: 'unknown', basis: 'none', reason: 'the group has no project yet to probe' });
  const onProject = (path: string, note?: string): Promise<Verdict> | Verdict =>
    project === null ? noProject() : get(port, `projects/${project}/${path}`, note);

  const rows: Array<[string, string, Promise<Verdict> | Verdict]> = [
    ['pipelines', 'pipelines and jobs', onProject('pipelines?per_page=1')],
    ['merge_requests', 'merge requests (group)', get(port, `${g}/merge_requests?per_page=1`)],
    ['releases', 'releases (group)', get(port, `${g}/releases?per_page=1`)],
    ['ci_components', 'CI/CD components', classifyComponents(inst?.version ?? null)],
    ['security_reports', 'SAST and other security reports in MRs', classifyPlan(plan, 'ultimate', 'security report views')],
    ['custom_flows', 'custom flows (Duo Agent Platform)', { status: 'unknown', basis: 'none', reason: 'no REST read endpoint (GraphQL only); the doctor sends only GETs' }],
    ['flows_api', 'Flows API (start and trace flows)', get(port, 'ai/duo_workflows/workflows', '404 may also mean this list route does not exist; confirm on the trial')],
    ['service_accounts', 'service accounts (group)', get(port, `${g}/service_accounts?per_page=1`)],
    ['deployment_approvals', 'deployment approvals', classifyPlan(plan, 'premium', 'deployment approval rules')],
    ['vulnerability_api', 'vulnerability API', project === null ? classifyPlan(plan, 'ultimate', 'the vulnerability report') : onProject('vulnerabilities?per_page=1')],
    ['audit_events', 'audit events (group)', get(port, `${g}/audit_events?per_page=1`)],
  ];
  const verdicts = await Promise.all(rows.map((r) => r[2]));
  return {
    group: grp, plan: ns?.plan ?? null, trial: ns?.trial ?? false, version: inst?.version ?? null,
    projectCount: projects?.length ?? null,
    capabilities: rows.map(([id, label], i) => ({ id, label, ...(verdicts[i] as Verdict) })),
  };
}
