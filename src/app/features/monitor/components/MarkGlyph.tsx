import { beatPath } from '../model/beat';
import type { MarkKind } from '../model/types';
import strip from './leads/strip.module.css';
import styles from './glyph.module.css';

const W = 34;
const B = 13;
const S = { x: 0, w: W, base: B, amax: 10, ins: 0.04 };

/** A small drawn mark in the beat grammar, in the leads' strokes. `icon` fits it to the sidebar's icon slot; the legend draws it wider. */
export function MarkGlyph({ kind, icon }: { kind: MarkKind; icon?: boolean }) {
  let body;
  if (kind === 'needs') {
    body = (
      <g className={strip.pips}>
        <path d={`M17 13 V5`} />
        <rect x={12} y={1} width={10} height={3} />
        <rect x={12} y={6} width={10} height={3} />
      </g>
    );
  } else if (kind === 'watching') body = <path className={strip.live} d={beatPath(S, 10, false)} />;
  else if (kind === 'setup') body = <path className={strip.forming} d={beatPath(S, 5, false)} />;
  else if (kind === 'quar')
    body = (
      <>
        <path className={strip.live} style={{ opacity: 0.5 }} d={beatPath(S, 8, true)} />
        <path className={strip.qdip} d={`M${W * 0.37} ${B} L${W * 0.395} ${B + 4} L${W * 0.41} ${B}`} />
      </>
    );
  else if (kind === 'stale')
    body = (
      <>
        <path className={strip.ghost} d={beatPath(S, 8, false)} />
        <path className={strip.flat} d={`M0 ${B} H${W}`} />
      </>
    );
  else
    body = (
      <>
        <path className={strip.unknown} d={`M5 ${B} H${W - 5}`} />
        <path className={strip.ticks} d={`M2 ${B - 3} V${B + 3} M${W - 2} ${B - 3} V${B + 3}`} />
      </>
    );
  return (
    <svg className={icon ? styles.icon : styles.glyph} viewBox={`0 -1 ${W} 20`} aria-hidden>
      <g className={strip.trace}>{body}</g>
    </svg>
  );
}
