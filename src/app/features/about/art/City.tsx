// The city's layers as SVG, from the generated model (model/city.ts): the far skyline under the stars, the nearer
// blocks on their hill, and the lamp posts and grass in front. Each is a <g> the camera moves (Scene sets its transform).
import type { Blocks, CityArt } from '../model/city';
import { f1 } from '../model/rng';
import s from './art.module.css';

const hexPts = (cx: number, cy: number, r: number) =>
  [0, 1, 2, 3, 4, 5].map((k) => {
    const a = (Math.PI / 180) * (60 * k + 30);
    return `${f1(cx + r * Math.cos(a))},${f1(cy + r * Math.sin(a))}`;
  }).join(' ');

function BlockPaths({ b, tone }: { b: Blocks; tone: string }) {
  return (
    <>
      <path className={tone} d={b.front} />
      <path className={s.roof} d={b.roof} />
      <path className={s.side} d={b.side} />
      <path className={s.lit} d={b.lit} />
      <path className={s.cool} d={b.cool} />
    </>
  );
}

/** The far layer: stars, the faint hexagon of the brand over the skyline, the far blocks. */
export function FarLayer({ city }: { city: CityArt }) {
  return (
    <>
      {city.stars.map((st, i) => (
        <circle key={i} className={s.star} cx={st.cx} cy={st.cy} r={st.r} opacity={st.o} />
      ))}
      <polygon className={s.hexA} points={hexPts(1700, 170, 250)} />
      <polygon className={s.hexB} points={hexPts(1700, 170, 205)} />
      <BlockPaths b={city.far} tone={s.far!} />
    </>
  );
}

/** The middle layer: the hill and the clusters of nearer blocks on it. */
export function MidLayer({ city }: { city: CityArt }) {
  return (
    <>
      <path className={s.hill} d={city.hill} />
      <BlockPaths b={city.mid} tone={s.mid!} />
    </>
  );
}

/** The front layer: lamp posts with their glow and wires, the grass, the fade into the ground. */
export function FrontLayer({ city }: { city: CityArt }) {
  return (
    <>
      {city.lamps.map((x) => (
        <g key={x}>
          <rect className={s.post} x={x} y={40} width={7} height={800} />
          <circle className={s.bulb} cx={x + 3} cy={46} r={6} />
          <circle cx={x + 3} cy={46} r={40} fill="url(#ab-glow)" opacity={0.7} />
          <path className={s.wire} d={`M${x + 3} 52 Q${x + 240} 140 ${x + 473} 52`} />
        </g>
      ))}
      <path className={s.grass} d={city.grass} />
      <rect x={-1600} y={470} width={7200} height={700} fill="url(#ab-fgfade)" />
    </>
  );
}

/** What does not move with the camera: the sky, the moon and its beams. */
export function Backdrop() {
  return (
    <>
      <rect width={1600} height={670} fill="url(#ab-sky)" />
      <circle cx={1180} cy={58} r={230} fill="url(#ab-moon)" />
      <circle className={s.moon} cx={1180} cy={58} r={30} />
      <g className={s.beams}>
        <polygon points="1120,0 1240,0 1700,700 1000,700" fill="url(#ab-beam)" opacity={0.5} />
        <polygon points="1000,0 1060,0 1000,700 520,700" fill="url(#ab-beam)" opacity={0.35} />
      </g>
    </>
  );
}
