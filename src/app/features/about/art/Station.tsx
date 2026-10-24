// One beat's station on the road: its pool of light, the post and emblem above it, its number and label below. The
// station on screen ("on") lights up and its emblem grows. Mouse only: the timeline is the keyboard's way to a beat.
import type { CSSProperties } from 'react';
import { pad2, type AboutBeat } from '../model/beats';
import { Emblem } from './emblems/emblemsB';
import s from './art.module.css';

interface Props {
  beat: AboutBeat;
  i: number;
  x: number;
  y: number;
  voice: string;
  on: boolean;
  onPick(i: number): void;
  onHover(i: number): void;
}

export function Station({ beat, i, x, y, voice, on, onPick, onHover }: Props) {
  return (
    <g
      className={`${s.st} ${on ? s.on : ''}`}
      transform={`translate(${x} ${y})`}
      style={{ '--e': voice } as CSSProperties}
      data-i={i}
      onClick={() => onPick(i)}
      onMouseEnter={() => onHover(i)}
      onMouseLeave={() => onHover(-1)}
    >
      <ellipse className={s.pool} cy={6} rx={86} ry={22} fill={`url(#ab-pool-${i})`} />
      <path className={s.stem} d="M0 4V-52" strokeWidth={3} />
      <g transform="translate(0 -92)">
        <g className={s.emb}>
          <Emblem beatKey={beat.key} />
        </g>
      </g>
      <text className={s.slab} y={58} textAnchor="middle" fontSize={24}>
        {`${pad2(i + 1)} · ${beat.label.toUpperCase()}`}
      </text>
      <circle r={70} cy={-40} fill="transparent" />
    </g>
  );
}
