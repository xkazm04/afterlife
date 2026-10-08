// What one load's step reads share: the port, the paired group, and the one listing of its projects that step 4 reads
// (the target and the belay projects, by GitLab id). A read that cannot be made says why; a project step 4 creates that
// is not there makes a step read failed, never unknown.
import { GitLabError } from '@/server/gitlab/errors';
import type { GitLabPort, GlProject } from '@/server/gitlab/port';
import type { StepRead } from './types';

export const why = (e: unknown): string => (e instanceof GitLabError ? `${e.kind}: ${e.message}` : e instanceof Error ? e.message : String(e));

/** The group's projects as listed once for this load, or why the listing failed. */
export type Listing = { ok: true; all: readonly GlProject[]; target: GlProject | null } | { ok: false; reason: string };

export interface StepCtx {
  port: GitLabPort;
  groupId: string | number;
  /** The paired group's path, for the texts. */
  group: string;
  /** The target's index id (BELAY_PROJECT). */
  project: string;
  listing: Listing;
  /** Today on this machine, YYYY-MM-DD (a trial's end is a date). */
  today: string;
}

/** A project step 4 creates is not there: the step that needs it reads failed, naming it. */
export class Missing extends Error {}

export const done = (text: string): StepRead => ({ state: 'done', text });
export const failed = (text: string): StepRead => ({ state: 'failed', text });
export const unknown = (reason: string): StepRead => ({ state: 'unknown', reason });

function listed(c: StepCtx): Exclude<Listing, { ok: false }> {
  if (!c.listing.ok) throw new Error(c.listing.reason);
  return c.listing;
}

/** The target project as the listing found it. */
export function targetOf(c: StepCtx): GlProject {
  const t = listed(c).target;
  if (!t) throw new Missing(`${c.project} is not in ${c.group} (step 4)`);
  return t;
}

/** A belay project of the group, by its path. */
export function belayOf(c: StepCtx, name: string): GlProject {
  const p = listed(c).all.find((x) => x.path === name);
  if (!p) throw new Missing(`${name} does not exist in ${c.group} (step 4)`);
  return p;
}

/** Runs one step's read: a missing project reads failed; any other failure reads unknown, with what was being read. */
export async function guarded(what: string, read: () => Promise<StepRead>): Promise<StepRead> {
  try {
    return await read();
  } catch (e) {
    if (e instanceof Missing) return failed(e.message);
    return unknown(`${what} failed: ${why(e)}`);
  }
}

/** A `port.get` answer that must be a list. */
export function rows(v: unknown, what: string): Record<string, unknown>[] {
  if (!Array.isArray(v)) throw new GitLabError('parse', `${what}: expected a JSON array`, what);
  return v.filter((x): x is Record<string, unknown> => x !== null && typeof x === 'object');
}

/** A `port.get` answer that must be an object. */
export function obj(v: unknown, what: string): Record<string, unknown> {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) throw new GitLabError('parse', `${what}: expected a JSON object`, what);
  return v as Record<string, unknown>;
}
