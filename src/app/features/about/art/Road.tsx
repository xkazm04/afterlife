// The path layer: the ground and its grid, the road with its two lane lines, the trail the light leaves behind it, the
// stations and the travelling light itself. The camera writes the trail's length and the light's position through the
// data-cam hooks (useFilmCamera), never through React, so a frame never re-renders the scene.
import { memo } from 'react';
import type { AboutBeat } from '../model/beats';
import type { Shot } from '../model/camera';
import type { Route } from '../model/road';
import { Station } from './Station';
import s from './art.module.css';

interface Props {
  route: Route;
  grid: string;
  beats: readonly AboutBeat[];
  voices: readonly string[];
  /** The station on screen, or -1 (the intro). */
  on: number;
  /** The station the pointer or focus previews, or -1. */
  hover: number;
  /** The light's tag: the stage the change is in. */
  tag: string;
  shot0: Shot;
  onPick(i: number): void;
  onHover(i: number): void;
}

function RoadImpl({ route, grid, beats, voices, on, hover, tag, shot0, onPick, onHover }: Props) {
  const dash = `${shot0.trail.toFixed(1)} 99999`;
  const ghost = hover >= 0 && hover !== on ? route.stations[hover] : undefined;
  const tagW = 18 + tag.length * 11;
  return (
    <>
      <rect x={-1600} y={296} width={7200} height={900} fill="url(#ab-ground)" />
      <path className={s.grid} d={grid} strokeWidth={1.2} />
      <path className={s.road} d={route.d} strokeWidth={30} strokeLinecap="round" />
      <path className={s.lane} d={route.d} strokeWidth={2.5} strokeDasharray="3 14" transform="translate(0 -13)" />
      <path className={s.lane} d={route.d} strokeWidth={2.5} strokeDasharray="3 14" transform="translate(0 13)" />
      <path data-cam="trail" className={s.trail} d={route.d} strokeWidth={5} strokeLinecap="round" strokeDasharray={dash} />
      <path data-cam="trail" className={s.trail2} d={route.d} strokeWidth={1.6} strokeLinecap="round" strokeDasharray={dash} />
      {beats.map((b, i) => (
        <Station key={i} beat={b} i={i} x={route.stations[i]![0]} y={route.stations[i]![1]} voice={voices[i]!} on={i === on} onPick={onPick} onHover={onHover} />
      ))}
      {ghost ? <circle className={s.ghost} r={30} cx={ghost[0]} cy={ghost[1] - 40} strokeWidth={2} strokeDasharray="4 6" /> : null}
      <g data-cam="token" transform={shot0.token}>
        <circle className={s.pulse} r={62} fill="url(#ab-token)" />
        <circle className={s.core} r={9} />
        {tag ? (
          <g transform="translate(16 -22)">
            <rect className={s.tagBox} x={0} y={-18} width={tagW} height={26} rx={7} />
            <text className={s.tagText} x={tagW / 2} y={1} textAnchor="middle" fontSize={18}>
              {tag}
            </text>
          </g>
        ) : null}
      </g>
    </>
  );
}

export const Road = memo(RoadImpl);
