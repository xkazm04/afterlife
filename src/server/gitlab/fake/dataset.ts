// The fake's in-memory GitLab: raw REST objects loaded from __fixtures__ (live recordings for the
// real group, [R] hand-written ones for the demo projects), cloned per instance so writes never leak.
import { rec, recs, type Rec } from '../adapter/fields';
import userFx from '../__fixtures__/live/user.json';
import groupFx from '../__fixtures__/live/group.json';
import namespaceFx from '../__fixtures__/live/namespace.json';
import metadataFx from '../__fixtures__/live/metadata.json';
import projectsFx from '../__fixtures__/docs/projects.json';
import ciFx from '../__fixtures__/docs/ledgerline/ci.json';
import mrFx from '../__fixtures__/docs/ledgerline/mr.json';
import deployFx from '../__fixtures__/docs/ledgerline/deploy.json';
import repoFx from '../__fixtures__/docs/ledgerline/repo.json';
import policyFx from '../__fixtures__/docs/policy-repo.json';
import ledgerFx from '../__fixtures__/docs/ledger-repo.json';

export type Plan = 'free' | 'premium' | 'ultimate';

export interface ProjectData {
  raw: Rec;
  pipelines: Rec[]; jobs: Record<string, Rec[]>; traces: Record<string, string>; testReports: Record<string, Rec>;
  mrs: Rec[]; notes: Record<string, Rec[]>; diffs: Record<string, Rec[]>;
  environments: Rec[]; deployments: Rec[]; releases: Rec[]; schedules: Rec[];
  files: Record<string, string>; vulnerabilities: Rec[];
  approvals: Record<string, Rec>;
}

export interface WriteLog { method: string; path: string; fields: Record<string, string> }

export interface FakeState {
  plan: Plan; user: Rec; instance: Rec; group: Rec; namespace: Rec;
  projects: ProjectData[]; writes: WriteLog[]; nextId: number;
}

export interface SeedOptions {
  plan?: Plan;
  /** false reproduces the real group today: no projects yet. */
  projects?: boolean;
  /** Replaces the recorded group and the [R] demo projects (see fake/demo/: a GitLab built from the demo dataset). */
  custom?: { group: Rec; projects: ProjectData[] };
}

const data = (fx: unknown): unknown => structuredClone(rec(fx, 'fixture').data);
const part = (fx: unknown, k: string): Rec => structuredClone(rec(rec(fx, 'fixture')[k] ?? {}, k));
const strMap = (fx: unknown, k: string): Record<string, string> => part(fx, k) as Record<string, string>;
const lists = (fx: unknown, k: string): Rec[] => recs(structuredClone(rec(fx, 'fixture')[k] ?? []), k);
const keyed = (fx: unknown, k: string): Record<string, Rec[]> => part(fx, k) as Record<string, Rec[]>;

export function project(raw: Rec, over: Partial<ProjectData> = {}): ProjectData {
  return {
    raw, pipelines: [], jobs: {}, traces: {}, testReports: {}, mrs: [], notes: {}, diffs: {},
    environments: [], deployments: [], releases: [], schedules: [], files: {}, vulnerabilities: [], approvals: {},
    ...over,
  };
}

export function seedState(o: SeedOptions = {}): FakeState {
  const plan = o.plan ?? 'ultimate';
  if (o.custom) return customState(o, plan, o.custom);
  const raws = recs(data(projectsFx), 'projects');
  const [ledgerline, policy, ledger] = raws;
  const projects: ProjectData[] =
    o.projects === false || !ledgerline || !policy || !ledger
      ? []
      : [
          project(ledgerline, {
            pipelines: lists(ciFx, 'pipelines'), jobs: keyed(ciFx, 'jobs'), traces: strMap(ciFx, 'traces'),
            testReports: part(ciFx, 'testReports') as Record<string, Rec>, mrs: lists(mrFx, 'mrs'), notes: keyed(mrFx, 'notes'),
            diffs: keyed(mrFx, 'diffs'), environments: lists(deployFx, 'environments'),
            deployments: lists(deployFx, 'deployments'), releases: lists(deployFx, 'releases'),
            schedules: lists(deployFx, 'schedules'), files: strMap(repoFx, 'files'),
            vulnerabilities: lists(repoFx, 'vulnerabilities'),
          }),
          project(policy, { files: strMap(policyFx, 'files') }),
          project(ledger, { files: strMap(ledgerFx, 'files') }),
        ];
  return {
    plan, user: rec(data(userFx), 'user'), instance: rec(data(metadataFx), 'metadata'), group: rec(data(groupFx), 'group'),
    namespace: { ...rec(data(namespaceFx), 'namespace'), plan, projects_count: projects.length },
    projects, writes: [], nextId: 1_000_000,
  };
}

function customState(o: SeedOptions, plan: Plan, c: NonNullable<SeedOptions['custom']>): FakeState {
  const base = seedState({ ...o, custom: undefined, projects: false });
  const projects = structuredClone(c.projects);
  return {
    ...base, group: { ...base.group, ...c.group }, projects,
    namespace: { ...base.namespace, name: c.group.name, path: c.group.path, full_path: c.group.full_path, plan, projects_count: projects.length },
  };
}
