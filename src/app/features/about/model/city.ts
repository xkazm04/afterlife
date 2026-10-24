// The night city behind the road, generated once from a fixed seed: stars, a far skyline, clusters of nearer blocks, a
// hill, lamp posts with their wires and the grass in front. Every block of one tone is merged into a few paths (front,
// roof, side, warm windows, cool windows), so the scene is a handful of elements, not thousands.
import { f1, rng } from './rng';

export interface Star {
  cx: number;
  cy: number;
  r: string;
  o: string;
}

/** One tone of blocks: each part a single path. */
export interface Blocks {
  front: string;
  roof: string;
  side: string;
  warm: string;
  cool: string;
}

export interface CityArt {
  stars: Star[];
  far: Blocks;
  mid: Blocks;
  /** The hill the near blocks stand on. */
  hill: string;
  /** Lamp post x positions. */
  lamps: number[];
  /** The grass silhouettes in front, one path. */
  grass: string;
  /** The ground's perspective grid, one path. */
  grid: string;
}

/** Draws blocks of one tone into its paths. */
function blocks() {
  const b: Blocks = { front: '', roof: '', side: '', warm: '', cool: '' };
  const add = (x: number, y: number, w: number, h: number, d: number, R: () => number) => {
    const top = y - h, dy = d * 0.6;
    // the prototype's order of draws: one draw to light a window, a second for its colour
    for (let a = 0; a < w - 8; a += 10) {
      for (let k = 8; k < h - 4; k += 12) {
        if (R() > 0.55) {
          const win = `M${f1(x + 4 + a)} ${f1(top + k)}h4v5h-4z`;
          if (R() > 0.7) b.cool += win;
          else b.warm += win;
        }
      }
    }
    b.front += `M${f1(x)} ${f1(top)}h${f1(w)}v${f1(h)}h${f1(-w)}z`;
    b.roof += `M${f1(x)} ${f1(top)}L${f1(x + d)} ${f1(top - dy)}H${f1(x + w + d)}L${f1(x + w)} ${f1(top)}z`;
    b.side += `M${f1(x + w)} ${f1(top)}L${f1(x + w + d)} ${f1(top - dy)}V${f1(y - dy)}L${f1(x + w)} ${f1(y)}z`;
  };
  return { b, add };
}

function gridPath(): string {
  let d = '';
  for (const y of [312, 330, 354, 386, 430, 490, 570, 670]) d += `M-1600 ${y}H5200`;
  for (let x = -1500; x < 5200; x += 150) d += `M${x} 300L${f1(x + (x - 1650) * 0.35)} 800`;
  return d;
}

export function buildCity(seed = 11): CityArt {
  const R = rng(seed);
  const stars: Star[] = [];
  for (let i = 0; i < 190; i++) {
    stars.push({ cx: Math.round(R() * 5400 - 1400), cy: Math.round(R() * 290), r: f1(0.5 + R() * 1.3), o: (0.2 + R() * 0.6).toFixed(2) });
  }
  const far = blocks();
  for (let x = -1300; x < 4100; ) {
    const w = 26 + R() * 44, h = 40 + R() * 170;
    far.add(x, 380, w, h, 8, R);
    x += w + 4 + R() * 14;
  }
  const mid = blocks();
  for (let x = -1000; x < 4200; x += 430 + R() * 160) {
    const y = 395 + R() * 20;
    for (let k = 0; k < 6; k++) mid.add(x + k * 30 + R() * 10, y + (k % 2) * 10, 24 + R() * 14, 50 + R() * 80, 9, R);
  }
  const lamps: number[] = [];
  for (let x = -1500; x < 5400; x += 470 + R() * 120) lamps.push(Math.round(x));
  let grass = '';
  for (let x = -1500; x < 5400; x += 60 + R() * 60) {
    const h = 18 + R() * 40;
    grass += `M${f1(x)} 760Q${f1(x + 3)} ${f1(760 - h)} ${f1(x + 8)} 760M${f1(x + 6)} 760Q${f1(x + 14)} ${f1(760 - h * 0.7)} ${f1(x + 18)} 760`;
  }
  const hill = 'M-1600 420 Q-900 360 -300 400 T 900 390 T 2100 410 T 3300 385 T 5200 405 V800 H-1600z';
  return { stars, far: far.b, mid: mid.b, hill, lamps, grass, grid: gridPath() };
}
