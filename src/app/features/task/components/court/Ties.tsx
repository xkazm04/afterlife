import type { TaskView } from '../../model/types';
import type { Selection } from '../../model/court/selection';
import { tieOpacity, tiePath, tieWidth, ties, untestedClaims, type TieKind } from '../../model/court/ties';
import type { ReplayState } from '../../model/verdict/replay';
import type { Geometry } from '../../hooks/useTieGeometry';

const COLOR: Record<TieKind, string> = { holds: 'var(--ok)', contradicts: 'var(--fail)', unknown: 'var(--unknown)' };

/**
 * The tie lines of the court. Green holds, red contradicts, dashed unknown. A claim no check tests gets a dashed
 * "?" and "no weight". Redrawn from the measured geometry, so it follows resizes and the inspector toggle.
 */
export function Ties({ task, sel, rv, geo }: { task: TaskView; sel: Selection; rv: ReplayState; geo: Geometry }) {
  const drawn = geo.taskId === task.id;
  const s = geo.scale;
  return (
    <svg aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
      {drawn
        ? ties(task, sel, rv).map((t) => {
            const a = geo.claims[t.claimId];
            const b = geo.checks[t.checkId];
            if (!a || !b) return null;
            const color = COLOR[t.kind];
            const on = t.emphasis === 'on';
            return (
              <g key={`${t.claimId}-${t.checkId}`} style={{ opacity: tieOpacity(t.emphasis) }}>
                <path
                  d={tiePath(a[0], a[1], b[0], b[1])}
                  fill="none"
                  stroke={color}
                  strokeWidth={tieWidth(t.emphasis) * s}
                  strokeDasharray={t.kind === 'unknown' ? `${4 * s} ${4 * s}` : undefined}
                  style={on ? { filter: `drop-shadow(0 0 4px ${color})` } : undefined}
                />
                <circle cx={b[0]} cy={b[1]} r={3 * s} fill={color} />
                <circle cx={a[0]} cy={a[1]} r={2 * s} fill={color} />
              </g>
            );
          })
        : null}
      {drawn
        ? untestedClaims(task, sel, rv).map((u) => {
            const a = geo.claims[u.claimId];
            if (!a) return null;
            const r = 8 * s;
            return (
              <g key={`untested-${u.claimId}`} style={{ opacity: u.dim ? 0.3 : 1 }}>
                <path d={`M${a[0]} ${a[1]} H${geo.laneX - r}`} fill="none" stroke="var(--unknown)" strokeWidth={1.4 * s} strokeDasharray={`${4 * s} ${4 * s}`} />
                <circle cx={geo.laneX} cy={a[1]} r={r} fill="var(--win-content)" stroke="var(--unknown)" strokeDasharray={`${3 * s} ${2 * s}`} />
                <text x={geo.laneX} y={a[1]} dy="0.35em" textAnchor="middle" fill="var(--unknown)" style={{ font: '700 var(--t-head) var(--mono)' }}>
                  ?
                </text>
              </g>
            );
          })
        : null}
    </svg>
  );
}
