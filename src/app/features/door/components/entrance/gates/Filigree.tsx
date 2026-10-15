import styles from './inlay.module.css';

/**
 * A gate leaf's inlay: circuit traces drawn like the city's PCB (straight runs, 45° bends, vias), a bus that gathers
 * from the hinge and narrows toward the lock, drops from the lintel, and the dial rings round the lock plate. Authored
 * for the left leaf in an 800 x 900 box whose right edge is the seam (the lock's centre at 800, 450); the right leaf is
 * its mirror. Pure geometry, computed once at module load, so the server and the client draw the same lines.
 */
const SEAM = 800;
const MID = 450;
const H = 900;
const R_BUS = 200;
const R_DROP = 245;
const R_DIAL = 300;
const n = (v: number) => Math.round(v * 10) / 10;
/** Where a horizontal run at height y meets the ring of radius r round the lock (left of the seam). */
const ringX = (r: number, y: number) => SEAM - Math.sqrt(r * r - (MID - y) ** 2);
/** Where a vertical drop at x meets the ring of radius r (above the lock). */
const ringY = (r: number, x: number) => MID - Math.sqrt(r * r - (SEAM - x) ** 2);

type Pt = readonly [number, number];
const traces: Pt[][] = [];
// the bus: seven runs from the hinge spine, each stepping down 45° and closing in on the lock, never crossing
for (let i = 0; i < 7; i++) {
  const y0 = 120 + i * 45;
  const y1 = 290 + i * 23;
  const xb = 290 + i * 14;
  traces.push([[64, y0], [xb, y0], [xb + y1 - y0, y1], [ringX(R_BUS, y1), y1]]);
}
// drops from the lintel to the outer ring (the seam itself is left to the bolts)
traces.push([[690, 56], [690, ringY(R_DROP, 690)]]);
traces.push([[600, 56], [600, 140], [650, 190], [650, ringY(R_DROP, 650)]]);
traces.push([[520, 56], [520, 96], [560, 136], [560, 236]]);

const flip = (t: Pt[]) => t.map(([x, y]) => [x, H - y] as const);
const all = [...traces, ...traces.map(flip)];
const pathOf = (t: Pt[]) => t.map(([x, y], i) => `${i ? 'L' : 'M'}${n(x)} ${n(y)}`).join('');
const via = ([x, y]: Pt, r: number) => `M${n(x - r)} ${n(y)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
const arc = (r: number) => `M${SEAM} ${MID - r}A${r} ${r} 0 0 0 ${SEAM} ${MID + r}`;

const D_TRACES = all.map(pathOf).join('');
const D_VIAS = all.map((t) => via(t[0]!, 4.2)).join('');
const D_PADS = all.map((t) => via(t[t.length - 1]!, 3)).join('');
const D_SPINE = `M64 120V${H - 120}`;
const D_RINGS = arc(R_BUS) + arc(R_DROP);
const D_DIAL = arc(R_DIAL);
// small diamonds along the spine and at the dial's quarter points: the filigree's jewels
const gem = (x: number, y: number, s: number) => `M${x} ${y - s}L${x + s} ${y}L${x} ${y + s}L${x - s} ${y}Z`;
const D_GEMS = [gem(64, 82, 9), gem(64, H - 82, 9), gem(64, MID, 7), gem(SEAM - R_DIAL, MID, 8), gem(SEAM - 212, MID - 212, 6), gem(SEAM - 212, MID + 212, 6)].join('');

function Lines() {
  return (
    <>
      <path className={styles.dial} d={D_DIAL} />
      <path className={styles.ring} d={D_RINGS} />
      <path className={styles.trace} d={D_SPINE + D_TRACES} />
      <path className={styles.via} d={D_VIAS} />
      <path className={styles.pad} d={D_PADS} />
      <path className={styles.gem} d={D_GEMS} />
    </>
  );
}

/** The inlay at rest (`lit` false: dim lines over the leaf's lattice) or charged (`lit`: bright, over its blurred halo). */
export function Filigree({ lit = false }: { lit?: boolean }) {
  return (
    <svg className={lit ? styles.figLit : styles.fig} viewBox="0 0 800 900" preserveAspectRatio="xMaxYMid slice" aria-hidden>
      {lit ? (
        <g className={styles.halo} filter="url(#gt-blur)">
          <Lines />
        </g>
      ) : (
        <rect width="800" height="900" fill="url(#gt-lattice)" />
      )}
      <Lines />
    </svg>
  );
}

/** Shared paint for both leaves: the halo's blur, the plate's metal gradient, the faint isometric lattice. */
export function GatesDefs() {
  return (
    <svg className={styles.defs} width="0" height="0" aria-hidden>
      <defs>
        <filter id="gt-blur" x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur stdDeviation="3.5" />
        </filter>
        <linearGradient id="gt-plate" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" className={styles.stopHi} />
          <stop offset="0.55" className={styles.stopMid} />
          <stop offset="1" className={styles.stopLo} />
        </linearGradient>
        <pattern id="gt-lattice" width="48" height="27.7" patternUnits="userSpaceOnUse">
          <path className={styles.lattice} d="M0 13.85L24 0L48 13.85L24 27.7Z" />
        </pattern>
      </defs>
    </svg>
  );
}
