// `belay doctor` capability probes. Each capability is available, unavailable or unknown, and never
// guessed: an endpoint answering 403/404 is "unavailable" with the reason; a network, auth or
// rate-limit failure is "unknown"; a capability with no safe read endpoint is decided by the plan
// (marked basis "plan") or stays unknown. When the preflight reads (user, group, instance) show one cause that stops every
// probe - glab cannot start, GitLab cannot be reached, no login, an unreadable group - the report names it (`blocker`,
// doctor/blocker.ts). For glab, network or login every row is "blocked by" it, with no endpoint GET spent; for an unreadable
// group the rows still run, and its group routes say they cannot be judged.
import { messageOf } from '@/lib/format/error';
import { findBlocker, type Blocker } from './doctor/blocker';
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
  /** The one cause that stops every probe (binary, network, login, group); null when there is none. */
  blocker: Blocker | null;
  /** The login's username, or null when the user read failed. */
  user: string | null;
  /** Why each of the four context reads (group, namespace, instance, projects) that failed, failed. */
  errors: ReadError[];
}
export interface ReadError { read: 'group' | 'namespace' | 'instance' | 'projects'; kind: string; message: string }

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

type Outcome<T> = { value: T; error: null } | { value: null; error: unknown };
/** One preflight read; a failed context read (not the user read) also lands in `errors`, kind and message, so the doctor can say why. */
const attempt = async <T>(read: ReadError['read'] | null, errors: ReadError[], f: () => Promise<T>): Promise<Outcome<T>> => {
  try { return { value: await f(), error: null }; } catch (e) {
    if (read) errors.push(e instanceof GitLabError ? { read, kind: e.kind, message: e.message } : { read, kind: 'unexpected', message: messageOf(e) });
    return { value: null, error: e };
  }
};

/** Watch a probe as it goes (/start streams it): the preflight once it decided, then each row as its verdict settles. */
export interface ProbeHooks {
  onPreflight?(seen: Omit<DoctorReport, 'capabilities'>): void;
  onRow?(row: Capability): void;
}

export async function probeCapabilities(port: GitLabPort, group: ProjectRef, hooks: ProbeHooks = {}): Promise<DoctorReport> {
  const errors: ReadError[] = [];
  const [me, g0, n0, i0, p0] = await Promise.all([
    attempt(null, errors, () => port.currentUser()), attempt('group', errors, () => port.getGroup(group)),
    attempt('namespace', errors, () => port.getNamespace(group)), attempt('instance', errors, () => port.instance()),
    attempt('projects', errors, () => port.listProjects(group)),
  ]);
  const [grp, ns, inst, projects] = [g0.value, n0.value, i0.value, p0.value];
  const blocker = findBlocker({ user: me.error, group: g0.error, instance: i0.error }, port.host, group);
  const base = {
    group: grp, plan: ns?.plan ?? null, trial: ns?.trial ?? false, version: inst?.version ?? null,
    projectCount: projects?.length ?? null, blocker, user: me.value?.username ?? null, errors,
  };
  hooks.onPreflight?.(base);
  const plan = planName(ns?.plan ?? null);
  const project = projects?.[0]?.id ?? null;
  const g = `groups/${encodeURIComponent(String(group))}`;
  const noProject = (): Verdict => ({ status: 'unknown', basis: 'none', reason: 'the group has no project yet to probe' });
  const onProject = (path: string, note?: string): Promise<Verdict> | Verdict =>
    project === null ? noProject() : get(port, `projects/${project}/${path}`, note);
  // A 403/404 on a group route is a verdict on the plan only when the group itself answered: a wrong BELAY_GROUP_ID or a
  // group the login cannot see answers 404/403 on every route, which says nothing about what the plan has.
  const onGroup = (path: string): Promise<Verdict> | Verdict =>
    grp === null ? { status: 'unknown', basis: 'none', reason: `group ${group} could not be read, so its endpoints cannot be judged` } : get(port, `${g}/${path}`);

  // Thunks: a blocked probe spends no GET on a row.
  const rows: Array<[string, string, () => Promise<Verdict> | Verdict]> = [
    ['pipelines', 'pipelines and jobs', () => onProject('pipelines?per_page=1')],
    ['merge_requests', 'merge requests (group)', () => onGroup('merge_requests?per_page=1')],
    ['releases', 'releases (group)', () => onGroup('releases?per_page=1')],
    ['ci_components', 'CI/CD components', () => classifyComponents(inst?.version ?? null)],
    ['security_reports', 'SAST and other security reports in MRs', () => classifyPlan(plan, 'ultimate', 'security report views')],
    ['custom_flows', 'custom flows (Duo Agent Platform)', () => ({ status: 'unknown', basis: 'none', reason: 'no REST read endpoint (GraphQL only); the doctor sends only GETs' })],
    ['flows_api', 'Flows API (start and trace flows)', () => get(port, 'ai/duo_workflows/workflows', '404 may also mean this list route does not exist; confirm on the trial')],
    ['service_accounts', 'service accounts (group)', () => onGroup('service_accounts?per_page=1')],
    ['deployment_approvals', 'deployment approvals', () => classifyPlan(plan, 'premium', 'deployment approval rules')],
    ['vulnerability_api', 'vulnerability API', () => project === null ? classifyPlan(plan, 'ultimate', 'the vulnerability report') : onProject('vulnerabilities?per_page=1')],
    ['audit_events', 'audit events (group)', () => onGroup('audit_events?per_page=1')],
  ];
  // An unreadable group is named, but the rows still run: its routes say why they cannot be judged (onGroup), the rest answer.
  if (blocker && blocker.kind !== 'group') {
    const blocked: Verdict = { status: 'unknown', basis: 'none', reason: `blocked by: ${blocker.text}` };
    const capabilities = rows.map(([id, label]) => ({ id, label, ...blocked }));
    capabilities.forEach((c) => hooks.onRow?.(c));
    return { ...base, capabilities };
  }
  const settled = (id: string, label: string, v: Verdict): Capability => {
    const c = { id, label, ...v };
    hooks.onRow?.(c);
    return c;
  };
  const capabilities = await Promise.all(rows.map(async ([id, label, run]) => settled(id, label, await run())));
  return { ...base, capabilities };
}
