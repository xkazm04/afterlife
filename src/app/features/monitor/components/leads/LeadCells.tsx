'use client';

import { memo, useId } from 'react';
import type { FleetProject } from '@/lib/demo/types';
import { leadPaths } from '../../model/beat';
import { beatLabel, isLive, isQuarantined, liveNeeds } from '../../model/totals';
import cells from './cells.module.css';
import strip from './strip.module.css';

const W = 120;
const H = 46;

/** One project's beat at cell size, in the same grammar and the same classes as the lead strip. */
function MiniBeat({ p }: { p: FleetProject }) {
  const paths = leadPaths([p], [{ x: 4, w: W - 8, base: 34, amax: 26, ins: 0.08 }]);
  const hatch = `cell-hatch-${useId().replace(/:/g, '')}`;
  return (
    <svg className={cells.beat} viewBox={`0 0 ${W} ${H}`} aria-hidden>
      {p.state === 'stale' ? (
        <>
          <defs>
            <pattern id={hatch} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <path d="M0 0V5" className={strip.hatchLine} />
            </pattern>
          </defs>
          <rect fill={`url(#${hatch})`} x={10} y={36} width={W - 20} height={8} />
        </>
      ) : null}
      <g className={strip.trace}>
        <path className={strip.live} d={paths.live} />
        <path className={strip.forming} d={paths.forming} />
        <path className={strip.ghost} d={paths.staleGhost} />
        <path className={strip.flat} d={paths.flat} />
        <path className={strip.unknown} d={paths.unknown} />
        <path className={strip.ticks} d={paths.ticks} />
        <path className={strip.qdip} d={paths.qdips} />
      </g>
    </svg>
  );
}

const TAG: Partial<Record<FleetProject['state'], string>> = { stale: 'stale', 'setting-up': 'setting up', 'not-set-up': 'not watched' };

/**
 * The open lead: every project of the group as a named cell, so a person reads names instead of hunting beats.
 * The amber badge is the decisions; a stale count is last known. Each cell is a button with the same roving focus.
 */
export const LeadCells = memo(function LeadCells({
  projects,
  selected,
  match,
  tabId,
  onPick,
  onHover,
}: {
  projects: readonly FleetProject[];
  selected: string | null;
  match: ReadonlySet<string> | null;
  tabId: string | null;
  onPick: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  return (
    <div className={cells.grid} data-marked={match ? '' : undefined} onPointerLeave={() => onHover(null)}>
      {projects.map((p) => {
        const n = liveNeeds(p);
        return (
          <button
            key={p.id}
            type="button"
            data-id={p.id}
            className={cells.cell}
            data-state={p.state}
            data-match={match?.has(p.id) || undefined}
            aria-pressed={p.id === selected}
            aria-label={beatLabel(p)}
            tabIndex={p.id === tabId ? 0 : -1}
            onClick={() => onPick(p.id)}
            onPointerEnter={() => onHover(p.id)}
            onFocus={() => onHover(p.id)}
          >
            <span className={cells.top}>
              {n ? <span className={cells.badge}>{n}</span> : null}
              {TAG[p.state] ? <span className={cells.tag}>{TAG[p.state]}</span> : null}
              {isLive(p) && isQuarantined(p) ? <span className={cells.q}>Q</span> : null}
            </span>
            <MiniBeat p={p} />
            <span className={cells.name}>{p.name}</span>
          </button>
        );
      })}
    </div>
  );
});
