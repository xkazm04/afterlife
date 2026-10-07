// The words of the front door: the answer block's lines, the readout's line for a tower or a district, stale texts.
// Lines come back as tone-tagged parts so the components colour them without parsing strings. Pure.
import type { FleetProject } from '@/lib/demo/types';
import { standingCount, tiersKnown } from '@/lib/tiers';
import { needsOf, type District } from './city';

export type Tone = 'plain' | 'amber' | 'stale' | 'unknown' | 'fail' | 'ok';
export type Part = readonly [string, Tone];

export const plural = (n: number, one: string, many = `${one}s`): string => (n === 1 ? one : many);
export const fmt = (n: number): string => n.toLocaleString('en-US');

export function ageStr(sec: number | null | undefined): string | null {
  if (sec == null) return null;
  if (sec < 90) return `${sec} s ago`;
  const m = Math.round(sec / 60);
  return m < 60 ? `${m} min ago` : `${Math.floor(m / 60)} h ${m % 60} min ago`;
}

export function staleText(p: FleetProject): string {
  const e = p.feed.error || 'feed stale';
  if (/ago/.test(e)) return e;
  const a = ageStr(p.feed.ageSec);
  return a ? `${e} · last good poll ${a}` : e;
}

const waits = (n: number): string => `${n} ${plural(n, 'decision')} wait${n === 1 ? 's' : ''}`;

/** The readout's line for one tower. Unknown stays unknown; stale says why and how old. */
export function projectLine(p: FleetProject): Part[] {
  const n = needsOf(p);
  if (p.state === 'not-set-up') return [['not watched · unknown, not zero', 'unknown']];
  if (p.state === 'stale') return [[`stale · ${staleText(p)}`, 'stale'], ...(n ? ([[` · ${n} last known`, 'plain']] as Part[]) : [])];
  const wait: Part = n ? [waits(n), 'amber'] : ['nothing waits', 'plain'];
  if (p.state === 'setting-up') return [[`setting up · ${p.setupStep ? p.setupStep.split(' · ')[0] : 'step unknown'} · `, 'plain'], wait];
  const proofs: Part[] = p.proofs7d
    ? [[` · ${p.proofs7d.pass} pass / `, 'plain'], [`${p.proofs7d.fail} fail`, p.proofs7d.fail ? 'fail' : 'plain']]
    : [[' · proofs unknown', 'unknown']];
  return [['watching · ', 'plain'], wait, ...proofs];
}

/** The readout's line for a district. */
export function districtLine(d: District): Part[] {
  const parts: Part[] = [[`${d.n} projects · `, 'plain'], [`${d.needs} ${plural(d.needs, 'decision')} wait`, 'amber']];
  if (d.stale) parts.push([' · ', 'plain'], [`${d.stale} stale`, 'stale']);
  if (d.setup) parts.push([` · ${d.setup} setting up`, 'plain']);
  if (d.nsu) parts.push([' · ', 'plain'], [`${d.nsu} not watched`, 'unknown']);
  return parts;
}

/** The answer's second lines: "6 each at gateway-service, gateway-web" and the next count down. */
export function topTiers(projects: readonly FleetProject[]): { n: number; names: string[] }[] {
  const top = projects.filter((p) => needsOf(p) > 0).sort((a, b) => needsOf(b) - needsOf(a) || a.name.localeCompare(b.name));
  const out: { n: number; names: string[] }[] = [];
  for (const p of top) {
    const n = needsOf(p);
    const last = out[out.length - 1];
    if (last?.n === n) last.names.push(p.name);
    else if (out.length < 2) out.push({ n, names: [p.name] });
    else break;
  }
  return out;
}

/** Tiers are counted only where they are known (tiersKnown); unknown is never 0 and never quarantined. */
const knownTiers = (p: FleetProject): boolean => p.state !== 'not-set-up' && tiersKnown(p);

/** Fleet-wide counts for the answer block. A class with no record yet is counted apart (norec), never as quarantined. */
export function fleetTotals(projects: readonly FleetProject[]) {
  const t = { n: projects.length, needs: 0, stale: 0, setup: 0, nsu: 0, watch: 0, quar: 0, norec: 0, pass: 0, fail: 0 };
  for (const p of projects) {
    t.needs += needsOf(p);
    if (p.state === 'stale') t.stale++;
    else if (p.state === 'setting-up') t.setup++;
    else if (p.state === 'not-set-up') t.nsu++;
    else t.watch++;
    if (knownTiers(p)) {
      t.quar += p.tiers?.quarantined ?? 0;
      t.norec += standingCount(p, 'no_record');
    }
    if (p.proofs7d) {
      t.pass += p.proofs7d.pass;
      t.fail += p.proofs7d.fail;
    }
  }
  return t;
}
export type FleetTotals = ReturnType<typeof fleetTotals>;

/** The answer marks: each lights its towers across the city. */
export type MarkKind = 'needs' | 'stale' | 'quar' | 'norec' | 'setup' | 'nsu' | 'watch';
export const MARK_TEST: Record<MarkKind, (p: FleetProject) => boolean> = {
  needs: (p) => needsOf(p) > 0,
  stale: (p) => p.state === 'stale',
  quar: (p) => knownTiers(p) && (p.tiers?.quarantined ?? 0) > 0,
  norec: (p) => knownTiers(p) && standingCount(p, 'no_record') > 0,
  setup: (p) => p.state === 'setting-up',
  nsu: (p) => p.state === 'not-set-up',
  watch: (p) => p.state === 'watching',
};

/** A tower's accessible name: its name, then what the readout would say. */
export const towerLabel = (p: FleetProject): string => `${p.name}, ${projectLine(p).map((x) => x[0]).join('')}`;
