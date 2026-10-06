// The ground under the city: circuit traces with vias, and a distant skyline on the horizon. Seeded, so it is the same
// every load. Everything comes back as a handful of path strings (Night Shift drew ~770 nodes here). Pure.
import { HH, HW, HZ, proj, type Pt } from './city';
import { pathD } from './shapes';

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const f1 = (n: number) => n.toFixed(1);
/** A circle as a path segment, so hundreds of vias are one node. */
const circle = (q: Pt, r: number) => `M${f1(q[0] - r)} ${f1(q[1])} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0`;

export interface Ground {
  traces: string;
  bus: string;
  vias: string;
  /** A few bus traces carry a moving pulse (drawn in their own small layer). */
  pulses: string[];
  skyline: string;
  skylit: string;
}

export function groundOf(seed = 20261006, maxPulses = 8): Ground {
  const R = rng(seed);
  const dirs: Pt[] = [
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
  ];
  const g: Ground = { traces: '', bus: '', vias: '', pulses: [], skyline: '', skylit: '' };
  for (let k = 0; k < 170; k++) {
    const x = -1500 + R() * 4600;
    const y = HZ + 20 + Math.pow(R(), 1.25) * 1500;
    let u = Math.round((x / HW + y / HH) / 2);
    let v = Math.round((y / HH - x / HW) / 2);
    let d = dirs[Math.floor(R() * 4)]!;
    const P: Pt[] = [proj(u, v)];
    const segs = 1 + Math.floor(R() * 3);
    for (let s = 0; s < segs; s++) {
      const L = 3 + Math.floor(R() * 11);
      u += d[0] * L;
      v += d[1] * L;
      P.push(proj(u, v));
      if (s < segs - 1) {
        const turn = R() < 0.5 ? 1 : -1;
        const nd: Pt = [-d[1] * turn, d[0] * turn];
        const c = 1 + Math.floor(R() * 2);
        u += (d[0] + nd[0]) * c;
        v += (d[1] + nd[1]) * c;
        P.push(proj(u, v));
        d = nd;
      }
    }
    const bus = R() < 0.18;
    const dd = pathD(P);
    if (bus) g.bus += dd + ' ';
    else g.traces += dd + ' ';
    g.vias += circle(P[0]!, 2.6) + circle(P[P.length - 1]!, 2.6);
    // keep the random sequence identical whether or not a pulse is drawn (Night Shift's reduced-motion skyline drifted)
    const pulseRoll = R();
    if ((bus || pulseRoll < 0.1) && P[0]![1] > HZ + 160 && g.pulses.length < maxPulses) g.pulses.push(dd);
  }
  for (let x = -1600; x < 3200; ) {
    const w = 14 + R() * 46;
    const h = 6 + Math.pow(R(), 1.6) * 44;
    const gap = R() < 0.25 ? 6 + R() * 30 : 0;
    g.skyline += `M${f1(x)} ${f1(HZ - h)}h${f1(w)}v${f1(h)}h${f1(-w)}Z `;
    if (h > 18 && R() < 0.5) {
      const n = 1 + Math.floor(R() * 3);
      for (let i = 0; i < n; i++) g.skylit += `M${f1(x + 4 + R() * (w - 8))} ${f1(HZ - h + 5 + R() * (h - 10))}h2v2h-2Z `;
    }
    x += w + gap;
  }
  return g;
}
