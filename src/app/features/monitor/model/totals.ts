// Counts and words of the Monitor: per lead, fleet-wide, the six marks, and the readout lines. Pure.
import { formatAge } from '@/lib/format/time';
import type { FleetProject } from '@/lib/demo/types';
import type { Lead, MarkKind, Totals } from './types';

export const isQuarantined = (p: FleetProject): boolean => (p.tiers?.quarantined ?? 0) > 0;
/** A live project draws a beat; stale and unwatched ones do not. */
export const isLive = (p: FleetProject): boolean => p.state === 'watching' || p.state === 'setting-up';
/** An unwatched project has no live count: its decisions are not drawn and not added. */
export const liveNeeds = (p: FleetProject): number => (p.state === 'not-set-up' ? 0 : p.needsYou);

export const MARKS: readonly { kind: MarkKind; label: string; test: (p: FleetProject) => boolean }[] = [
  { kind: 'needs', label: 'Needs you', test: (p) => liveNeeds(p) > 0 },
  { kind: 'stale', label: 'Stale', test: (p) => p.state === 'stale' },
  { kind: 'quar', label: 'Quarantined', test: (p) => isLive(p) && isQuarantined(p) },
  { kind: 'setup', label: 'Setting up', test: (p) => p.state === 'setting-up' },
  { kind: 'unwatched', label: 'Not watched', test: (p) => p.state === 'not-set-up' },
  { kind: 'watching', label: 'Watching', test: (p) => p.state === 'watching' },
];

export const markTest = (kind: MarkKind): ((p: FleetProject) => boolean) => MARKS.find((m) => m.kind === kind)!.test;

function count(projects: readonly FleetProject[]): Omit<Lead, 'group' | 'projects'> {
  const c = { needs: 0, stale: 0, setup: 0, unwatched: 0, watching: 0, quar: 0 };
  for (const p of projects) {
    c.needs += liveNeeds(p);
    if (p.state === 'stale') c.stale++;
    else if (p.state === 'setting-up') c.setup++;
    else if (p.state === 'not-set-up') c.unwatched++;
    else c.watching++;
    if (isLive(p)) c.quar += p.tiers?.quarantined ?? 0;
  }
  return c;
}

/** One lead per group, in the data's group order; projects keep their fleet order along the lead. */
export function leadsOf(groups: readonly string[], projects: readonly FleetProject[]): Lead[] {
  return groups.map((group) => {
    const list = projects.filter((p) => p.group === group);
    return { group, projects: list, ...count(list) };
  });
}

export function totalsOf(projects: readonly FleetProject[]): Totals {
  const t = { n: projects.length, needsP: 0, pass: 0, fail: 0, ...count(projects) };
  for (const p of projects) {
    if (liveNeeds(p) > 0) t.needsP++;
    if (p.proofs7d) {
      t.pass += p.proofs7d.pass;
      t.fail += p.proofs7d.fail;
    }
  }
  return t;
}

export const decisionsWord = (n: number): string => (n === 1 ? '1 decision waits' : `${n} decisions wait`);

/** The projects holding the most decisions, most first, for the headline's second line. */
export function topWaiting(projects: readonly FleetProject[], k = 4): FleetProject[] {
  return projects.filter((p) => liveNeeds(p) > 0).sort((a, b) => b.needsYou - a.needsYou || a.name.localeCompare(b.name)).slice(0, k);
}

/** The readout's line for one project: its state in words, then what waits. Unknown stays unknown. */
export function stateLine(p: FleetProject): string {
  const parts: string[] = [];
  if (p.state === 'watching') parts.push(`watching · polled ${formatAge(p.feed.ageSec)} ago`);
  else if (p.state === 'setting-up') parts.push(`setting up · ${p.armed} of 8 tracks armed${p.setupStep ? ` · ${p.setupStep}` : ' · step unknown'}`);
  else if (p.state === 'stale') parts.push(`stale · ${p.feed.error ?? `no good poll for ${formatAge(p.feed.ageSec)}`}`);
  else parts.push('not watched · unknown, not zero');
  const n = liveNeeds(p);
  if (n) parts.push(p.state === 'stale' ? `${decisionsWord(n)} (last known)` : decisionsWord(n));
  if (isLive(p) && isQuarantined(p)) parts.push('quarantined class');
  return parts.join(' · ');
}

/** The readout's line for a lead. */
export function leadLine(l: Lead): string {
  const parts = [`${l.projects.length} projects`, decisionsWord(l.needs)];
  if (l.stale) parts.push(`${l.stale} stale`);
  if (l.setup) parts.push(`${l.setup} setting up`);
  if (l.unwatched) parts.push(`${l.unwatched} not watched`);
  return parts.join(' · ');
}

/** A project's accessible name: what the beat says, in words. */
export const beatLabel = (p: FleetProject): string => `${p.name}, ${stateLine(p)}`;
