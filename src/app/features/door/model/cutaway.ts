// L2: one project as a cutaway tower. Nine floors, one per stage, lit by its rung (dashed when unknown); the class
// windows on the right wall carry tier letters; the antenna is the feed; a beacon on the roof is its decisions. Pure.
import type { FleetProject } from '@/lib/demo/types';
import { needsOf, type Pt } from './city';
import { pathD, points } from './shapes';
import { ageStr } from './words';

export const CX = 336;
export const CY = 822;
const A = 118;
const B = 59;
const FH = 50;
const N = 9;
const H = N * FH + 5;

const V = (dx: number, dy: number, z: number): Pt => [CX + dx, CY + dy - z];
const Lz = (z: number) => V(-A, 0, z);
const Bz = (z: number) => V(0, B, z);
const Rz = (z: number) => V(A, 0, z);
const Tz = (z: number) => V(0, -B, z);

export type Mode = '' | 'ghost' | 'scaf' | 'st';

export function cutawayOf(p: FleetProject, classes: readonly string[], stages: readonly string[]) {
  const ghost = p.state === 'not-set-up';
  const scaf = p.state === 'setting-up';
  const stale = p.state === 'stale';
  const mode: Mode = ghost ? 'ghost' : scaf ? 'scaf' : stale ? 'st' : '';
  const floors = Array.from({ length: N }, (_, i) => {
    const z = i * FH;
    const r = ghost ? null : (p.stages?.[i] ?? null);
    const m = V(-A * 0.45, B * 0.45, z + 5 + FH * 0.5);
    const ly = CY - z - FH * 0.5 + 7;
    return {
      i,
      rung: r,
      lip: r == null ? pathD([Lz(z + 4), Bz(z + 4), Rz(z + 4)]) : points([Lz(z + 5), Bz(z + 5), Bz(z), Lz(z)]),
      top: points([Tz(z + 5), Rz(z + 5), Bz(z + 5), Lz(z + 5)]),
      q: r == null ? m : null,
      label: { x: CX - A - 18, y: ly, name: (stages[i] ?? '').replace(/^./, (c) => c.toUpperCase()) },
      tick: pathD([
        [CX - A - 12, ly - 7],
        [CX - A - 3, ly - 7],
      ]),
    };
  });
  const W = (sv: number, z: number): Pt => [CX + A * sv, CY + B - B * sv - z];
  const windows = classes.map((k, i) => {
    const [row, col] = [Math.floor(i / 2), i % 2];
    const s1 = col ? 0.55 : 0.13;
    const s2 = s1 + 0.32;
    const zt = H - 22 - row * 74;
    const zb = zt - 44;
    return { k, i, tier: ghost ? null : (p.classTiers?.[k] ?? null), poly: points([W(s1, zb), W(s2, zb), W(s2, zt), W(s1, zt)]), c: W((s1 + s2) / 2, (zt + zb) / 2) };
  });
  const am = Rz(H);
  const tip: Pt = [am[0], am[1] - 128];
  const never = p.feed.ageSec == null;
  let lines: string[];
  let tone: 'ok' | 'st' | 'u';
  if (never) [lines, tone] = [['never polled'], 'u'];
  else if (stale) {
    lines = ['feed stale', ...(p.feed.error ?? '').split(' · ').filter(Boolean)];
    const a = ageStr(p.feed.ageSec);
    if (!/ago/.test(p.feed.error ?? '') && a) lines.push(`last good poll ${a}`);
    tone = 'st';
  } else [lines, tone] = [[`polled ${ageStr(p.feed.ageSec)}`], 'ok'];
  const tw = Math.max(...lines.map((l) => l.length)) * 10.2 + 26;
  const tag = { x: tip[0] + 16, y: tip[1] - 18 - (lines.length - 1) * 12, w: Math.round(tw), h: lines.length * 25 + 12, lines, tone };
  const n = needsOf(p);
  const rc = V(0, 0, H);
  const bh = 60 + n * 26;
  const beacon = n > 0 ? { x: rc[0], y: rc[1], h: bh, w: 64, label: stale ? `${n} last known` : `${n} waiting`, stale } : null;
  return {
    mode,
    stale,
    ghost,
    scaf,
    floors,
    windows,
    foot: points([Tz(0), Rz(0), Bz(0), Lz(0)]),
    spine: pathD([Tz(0), Tz(H)]),
    glass: points([Lz(0), Bz(0), Bz(H), Lz(H)]),
    wall: points([Bz(0), Rz(0), Rz(H), Bz(H)]),
    roof: points([Tz(H), Rz(H), Bz(H), Lz(H)]),
    edges: `${pathD([Lz(0), Bz(0), Rz(0)])} ${pathD([Lz(0), Lz(H)])} ${pathD([Bz(0), Bz(H)])} ${pathD([Rz(0), Rz(H)])} ${pathD([Tz(H), Rz(H), Bz(H), Lz(H)], true)}`,
    mast: { from: am, tip, never, live: !never && !stale },
    tag,
    beacon,
    scaffold: scaf ? { d: `${pathD([Lz(H), Lz(H + 24)])} ${pathD([Bz(H), Bz(H + 24)])}`, light: Lz(H + 28) } : null,
    rings: { a: [A * 1.55, B * 1.55], b: [A * 2.1, B * 2.1], pool: [A * 2.6, B * 2.6] },
  };
}
export type Cutaway = ReturnType<typeof cutawayOf>;
