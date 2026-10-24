// The film's scene: one SVG, a fixed sky and four layers the camera moves (far city, near city, the road, the lamps in
// front). It is decoration (aria-hidden): the caption, the timeline and the live region carry the words.
import { memo, type Ref } from 'react';
import type { AboutBeat } from '../model/beats';
import { SCENE_H, type Shot } from '../model/camera';
import type { CityArt } from '../model/city';
import type { Route } from '../model/road';
import { Backdrop, FarLayer, FrontLayer, MidLayer } from './City';
import { Road } from './Road';
import { SceneDefs } from './SceneDefs';

const Far = memo(FarLayer);
const Mid = memo(MidLayer);
const Front = memo(FrontLayer);
const Defs = memo(SceneDefs);

interface Props {
  className?: string;
  city: CityArt;
  route: Route;
  beats: readonly AboutBeat[];
  voices: readonly string[];
  on: number;
  hover: number;
  tag: string;
  /** The camera writes each frame into the scene through this (useFilmCamera). */
  svgRef: Ref<SVGSVGElement>;
  /** The first frame's shot (the server's and hydration's); the camera takes over from it. */
  shot0: Shot;
  onPick(i: number): void;
  onHover(i: number): void;
}

export function Scene({ className, city, route, beats, voices, on, hover, tag, svgRef, shot0, onPick, onHover }: Props) {
  return (
    <svg ref={svgRef} className={className} viewBox={`0 0 1600 ${SCENE_H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true" data-role="about-scene">
      <Defs voices={voices} />
      <Backdrop />
      <g data-layer="far" transform={shot0.layers.far}>
        <Far city={city} />
      </g>
      <g data-layer="mid" transform={shot0.layers.mid}>
        <Mid city={city} />
      </g>
      <g data-layer="path" transform={shot0.layers.path}>
        <Road route={route} grid={city.grid} beats={beats} voices={voices} on={on} hover={hover} tag={tag} shot0={shot0} onPick={onPick} onHover={onHover} />
      </g>
      <g data-layer="fg" transform={shot0.layers.fg}>
        <Front city={city} />
      </g>
    </svg>
  );
}
