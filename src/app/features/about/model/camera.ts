// The film's camera, as pure numbers: where it stands on the road (t, a beat position) and how far in it is (z: 0 the
// wide shot of the whole route, 1 close on one beat). Each scene layer moves with its own parallax and depth, so the
// far city drifts slower than the road and the lamp posts in front faster.
import type { Route } from './road';
import { lerp } from './rng';

export interface Cam {
  t: number;
  z: number;
}

/** The scene's viewBox height (its width is 1600). */
export const SCENE_H = 670;

const WIDE = 0.47; // the wide shot's scale
const CLOSE = 1.28; // the close shot's scale
const CY = 235; // the road's mean height, the camera's vertical pivot
const AY = 236; // where that pivot sits on screen, close in
const HOME_X = 1650; // the wide shot's centre on the road

/** The scene's layers, back to front: q how much of the zoom it takes, par how much of the pan. */
export const LAYERS = [
  { id: 'far', q: 0.45, par: 0.3 },
  { id: 'mid', q: 0.7, par: 0.6 },
  { id: 'path', q: 1, par: 1 },
  { id: 'fg', q: 0.75, par: 1.4 },
] as const;
export type LayerId = (typeof LAYERS)[number]['id'];

export interface Shot {
  /** Each layer's transform attribute. */
  layers: Record<LayerId, string>;
  /** The travelling light's transform. */
  token: string;
  /** How much of the road the light has drawn behind it. */
  trail: number;
}

/**
 * The shot for a camera at time `now` (ms). `drift` (0 under reduced motion) is the slow sway of a hand-held camera,
 * only close in.
 */
export function shotAt(route: Route, cam: Cam, now: number, drift: boolean): Shot {
  const k = cam.z;
  const s = lerp(WIDE, CLOSE, k);
  const len = route.lenAt(cam.t);
  const P = route.pointAt(len);
  const sway = drift ? Math.sin(now / 2600) * 9 * k : 0;
  const cx = lerp(HOME_X, P.x, k) + sway;
  const ax = lerp(800, 1010, k);
  const ay = lerp(300, AY, k);
  const layers = {} as Record<LayerId, string>;
  for (const l of LAYERS) {
    const sl = Math.pow(s, l.q);
    const cxl = HOME_X + (cx - HOME_X) * l.par;
    layers[l.id] = `translate(${ax.toFixed(2)} ${ay.toFixed(1)}) scale(${sl.toFixed(4)}) translate(${(-cxl).toFixed(2)} ${-CY})`;
  }
  return { layers, token: `translate(${P.x.toFixed(1)} ${P.y.toFixed(1)}) scale(${(1 + (1 - k) * 1.3).toFixed(2)})`, trail: len };
}

/** Where the intro starts: a little before the first station, in the wide shot. */
export const INTRO_FROM: Cam = { t: -0.6, z: 0 };
