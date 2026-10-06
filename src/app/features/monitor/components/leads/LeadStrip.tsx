'use client';

import { memo, useId, useMemo, useRef } from 'react';
import type { FleetProject } from '@/lib/demo/types';
import { leadPaths, peakX, pipCount, slotsAlong, type Slot } from '../../model/beat';
import { beatLabel } from '../../model/totals';
import { useSize } from '../../hooks/useSize';
import styles from './strip.module.css';

interface Props {
  projects: readonly FleetProject[];
  /** A thin lead: the others while one lead is open into cells. Flags shrink to dots. */
  thin?: boolean;
  selected: string | null;
  /** The ids the lit mark matches, or null when no mark is lit. */
  match: ReadonlySet<string> | null;
  /** The one beat of this lead that takes Tab (roving focus); arrows move from there. */
  tabId: string | null;
  onPick: (id: string) => void;
  onHover: (id: string | null) => void;
}

function Pips({ p, s, thin }: { p: FleetProject; s: Slot; thin?: boolean }) {
  const n = pipCount(p);
  if (!n) return null;
  const x = peakX(s);
  if (thin) return <circle cx={x} cy={3.5} r={2.4} />;
  const pw = Math.max(5, Math.min(12, s.w * 0.55));
  const top = 4;
  const bot = top + (n - 1) * 5.7 + 3.6;
  const peak = p.state === 'watching' || p.state === 'setting-up' ? s.base - s.amax * 0.4 : s.base - 3;
  return (
    <g>
      <path d={`M${x} ${bot} V${Math.max(bot, peak)}`} />
      {Array.from({ length: n }, (_, i) => (
        <rect key={i} x={x - pw / 2} y={top + i * 5.7} width={pw} height={3.6} />
      ))}
    </g>
  );
}

/**
 * One group as a phosphor lead: every project a beat, drawn as SVG once per size (a handful of paths, not one node
 * per wave). Amber pips are decisions, a rose dip is a quarantined class, hatching is stale, a dashed break is not
 * watched. A CSS sweep stands in for the poll. Each beat is a focusable button for the pointer and the keyboard.
 */
export const LeadStrip = memo(function LeadStrip({ projects, thin, selected, match, tabId, onPick, onHover }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { w, h } = useSize(ref);
  const hatch = `hatch-${useId().replace(/:/g, '')}`;

  const geo = useMemo(() => {
    if (!w || !h) return null;
    const base = thin ? h * 0.68 : h * 0.76;
    const amax = thin ? Math.max(4, h * 0.38) : Math.max(12, base - 46);
    const slots = slotsAlong(projects.length, w, base, amax);
    const items = projects.flatMap((p, i) => {
      const s = slots[i];
      return s ? [{ p, s }] : [];
    });
    return { items, paths: leadPaths(projects, slots) };
  }, [projects, w, h, thin]);

  return (
    <div ref={ref} className={styles.strip} data-thin={thin || undefined} data-marked={match ? '' : undefined} onPointerLeave={() => onHover(null)}>
      {geo ? (
        <svg className={styles.svg} width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          <defs>
            <pattern id={hatch} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <path d="M0 0V5" className={styles.hatchLine} />
            </pattern>
          </defs>
          <g className={styles.trace}>
            <path className={styles.live} d={geo.paths.live} />
            <path className={styles.forming} d={geo.paths.forming} />
            <path className={styles.ghost} d={geo.paths.staleGhost} />
            <path className={styles.flat} d={geo.paths.flat} />
            <path className={styles.unknown} d={geo.paths.unknown} />
            <path className={styles.ticks} d={geo.paths.ticks} />
            <path className={styles.qdip} d={geo.paths.qdips} />
          </g>
          <g fill={`url(#${hatch})`}>
            {geo.items.map(({ p, s }) =>
              p.state === 'stale' ? <rect key={p.id} x={s.x + s.w * 0.05} y={s.base + 1.5} width={s.w * 0.9} height={Math.max(4, s.amax * 0.42)} /> : null,
            )}
          </g>
          <g className={styles.pips}>
            {geo.items.map(({ p, s }) => (
              <Pips key={p.id} p={p} s={s} thin={thin} />
            ))}
          </g>
          {geo.items.map(({ p, s }) => {
            const cls = [styles.hit, match?.has(p.id) ? styles.match : '', p.id === selected ? styles.sel : ''].filter(Boolean).join(' ');
            return (
              <rect
                key={p.id}
                data-id={p.id}
                className={cls}
                x={s.x + 0.5}
                y={0.5}
                width={Math.max(1, s.w - 1)}
                height={h - 1}
                rx={3}
                role="button"
                tabIndex={p.id === tabId ? 0 : -1}
                aria-label={beatLabel(p)}
                aria-pressed={p.id === selected}
                onClick={() => onPick(p.id)}
                onPointerEnter={() => onHover(p.id)}
                onFocus={() => onHover(p.id)}
              />
            );
          })}
        </svg>
      ) : null}
      <div className={styles.sweep} aria-hidden />
    </div>
  );
});
