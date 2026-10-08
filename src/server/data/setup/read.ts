// Setup's live reads. The snapshot gives what the index holds (the pairing row, the target project) synchronously; the
// rest is a read-only port call made when /setup loads or when the screen asks again: each track's arm block on the
// target's default branch (checkArm), the belay doctor's capability probe (probeCapabilities), the operator's login,
// the group's projects and the human steps a read can observe (humanSteps.ts). Nothing here writes, and nothing falls
// back to the demo's catalogue: a read that cannot be made says so.
import { checkArm } from '@/server/actions/arm/read';
import { armOf, NOT_DEFINED } from '@/server/actions/arm/content';
import { probeCapabilities } from '@/server/gitlab/capabilities';
import { GitLabError } from '@/server/gitlab/errors';
import type { GitLabPort } from '@/server/gitlab/port';
import type { PairingRow } from '@/server/index/repositories/pairing';
import { why, type Listing, type StepCtx } from './ctx';
import { bootstrapRead, licenceRead, runnerRead, secretsRead } from './humanSteps';
import { NOT_PROBED, stampOf, type DoctorRead, type LiveSetupRead, type ReadStamp, type StepRead, type StepsRead, type TrackRead } from './types';

/** What the reads go through: the live runtime's port, the configured group, and the index's GitLab ids. */
export interface SetupPort {
  port: GitLabPort;
  groupId: string | number;
  gitlabId: (indexId: string) => Promise<number | null>;
}

/** The belay projects step 4 creates beside the target. */
export const BELAY_PROJECTS = ['belay-pack', 'belay-policy', 'belay-ledger', 'belay-engine', 'belay-apply'] as const;

const NO_PORT = 'live mode has no GitLab port yet (the first poll has not finished)';

/**
 * The steps a read can observe: 0 (glab's login), 1 (the pairing row), 4 (the projects), and the human steps 3 (the plan),
 * 6 (the runner), 8 (its settings that hold no secret: it never reads done) and 10 (the bootstrap MR). Every other step is
 * unknown, "not probed".
 */
export const OBSERVED_STEPS: readonly number[] = [0, 1, 3, 4, 6, 8, 10];

export interface SetupReads {
  group: string;
  host: string;
  project: string;
  projects: readonly string[];
  tracks(ids: readonly string[]): Promise<{ tracks: Record<string, TrackRead>; at: ReadStamp }>;
  doctor(): Promise<DoctorRead>;
  steps(): Promise<StepsRead>;
}

async function trackRead(p: SetupPort, project: string, id: string): Promise<TrackRead> {
  if (!armOf(id)) return { state: 'undefined', text: NOT_DEFINED(id) };
  try {
    const c = await checkArm(p, { kind: 'arm-track', project, track: id });
    if (c.status === 'read') return c.armed ? { state: 'armed', text: c.text } : { state: 'absent', text: c.text };
    return { state: 'unknown', reason: c.status === 'refused' ? c.reason : c.text };
  } catch (e) {
    return { state: 'unknown', reason: `the read failed: ${why(e)}` };
  }
}

async function loginRead(p: SetupPort): Promise<StepRead> {
  try {
    const u = await p.port.currentUser();
    return { state: 'done', text: `glab api user → 200 · signed in as @${u.username}` };
  } catch (e) {
    if (e instanceof GitLabError && e.kind === 'auth') return { state: 'failed', text: `glab api user → ${e.status ?? 'no answer'} · not signed in (${e.message})` };
    return { state: 'unknown', reason: `glab api user failed: ${why(e)}` };
  }
}

function pairingRead(pairing: PairingRow | null): StepRead {
  if (!pairing) return { state: 'failed', text: 'the index has no pairing row: no poll has paired a group yet' };
  const where = `${pairing.groupPath} on ${pairing.gitlabHost}`;
  return pairing.checkoutPath
    ? { state: 'done', text: `paired with ${where} · checkout ${pairing.checkoutPath}` }
    : { state: 'failed', text: `${where} is paired, but no checkout is recorded` };
}

/** The group's projects, listed once per read of the steps: step 4 reads it, and the other steps find their projects in it. */
async function listing(p: SetupPort, project: string): Promise<Listing> {
  try {
    const [all, gid] = await Promise.all([p.port.listProjects(p.groupId), p.gitlabId(project)]);
    return { ok: true, all, target: all.find((x) => (gid !== null ? x.id === gid : x.path === project)) ?? null };
  } catch (e) {
    return { ok: false, reason: `listing the group's projects failed: ${why(e)}` };
  }
}

function projectsRead(l: Listing, project: string, want: readonly string[]): StepRead {
  if (!l.ok) return { state: 'unknown', reason: l.reason };
  const has = (name: string) => (name === project ? l.target !== null : l.all.some((x) => x.path === name));
  const missing = want.filter((name) => !has(name));
  const seen = `${want.length - missing.length} of ${want.length} projects exist`;
  return missing.length ? { state: 'failed', text: `${seen} · missing ${missing.join(', ')}` } : { state: 'done', text: seen };
}

const isoDay = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Setup's reads for one load, bound to the port and the snapshot's pairing row. `port` null: every read says why not. */
export function setupReads(port: SetupPort | null, pairing: PairingRow | null, project: string, now: () => Date = () => new Date()): SetupReads {
  const projects = [project, ...BELAY_PROJECTS];
  const unknown = (reason: string): StepRead => ({ state: 'unknown', reason });
  return {
    group: pairing?.groupPath ?? 'not paired',
    host: pairing?.gitlabHost ?? 'gitlab.com',
    project,
    projects,
    async tracks(ids) {
      const at = stampOf(now());
      const reads = await Promise.all(ids.map((id) => (port ? trackRead(port, project, id) : Promise.resolve<TrackRead>(armOf(id) ? { state: 'unknown', reason: NO_PORT } : { state: 'undefined', text: NOT_DEFINED(id) }))));
      return { tracks: Object.fromEntries(ids.map((id, i) => [id, reads[i] as TrackRead])), at };
    },
    async doctor() {
      const at = stampOf(now());
      if (!port) return { ...at, rows: [], error: NO_PORT };
      try {
        const r = await probeCapabilities(port.port, port.groupId);
        return { ...at, rows: r.capabilities.map((c) => ({ id: c.id, label: c.label, status: c.status, reason: c.reason })), error: null };
      } catch (e) {
        return { ...at, rows: [], error: `belay doctor failed: ${why(e)}` };
      }
    },
    async steps() {
      const at = stampOf(now());
      const steps: Record<number, StepRead> = {};
      for (let n = 0; n <= 14; n++) steps[n] = unknown(NOT_PROBED);
      steps[1] = pairingRead(pairing);
      if (!port) {
        for (const n of OBSERVED_STEPS) if (n !== 1) steps[n] = unknown(NO_PORT);
        return { ...at, steps };
      }
      const l = await listing(port, project);
      const c: StepCtx = { port: port.port, groupId: port.groupId, group: pairing?.groupPath ?? String(port.groupId), project, listing: l, today: isoDay(now()) };
      steps[4] = projectsRead(l, project, projects);
      [steps[0], steps[3], steps[6], steps[8], steps[10]] = await Promise.all([loginRead(port), licenceRead(c), runnerRead(c), secretsRead(c), bootstrapRead(c)]);
      return { ...at, steps };
    },
  };
}

/** Everything Setup opens on in live mode, read now. */
export async function readLiveSetup(r: SetupReads, trackIds: readonly string[]): Promise<LiveSetupRead> {
  const [t, doctor, steps] = await Promise.all([r.tracks(trackIds), r.doctor(), r.steps()]);
  return { group: r.group, host: r.host, project: r.project, projects: r.projects, tracks: t.tracks, tracksAt: t.at, doctor, steps };
}
