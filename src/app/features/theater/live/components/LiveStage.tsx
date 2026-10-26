import type { ReactNode } from 'react';
import { LANE_TONE } from '@/app/features/runs/components/WaveState';
import { usd, wall } from '@/app/features/runs/model/format';
import { Chip } from '@/components/status/chip/Chip';
import type { LiveView } from '../model/types';
import { LiveHeader } from './LiveHeader';
import styles from '../Live.module.css';

/** The hero: the running lane (title, elapsed, cost so far). With no wave running there is no hero, only the summary. */
function Hero({ v }: { v: LiveView }) {
  if (v.phase === 'none') {
    return <p className={styles.empty}>No runs yet. A wave appears here the moment the runner writes its first event to .afterlife/runs.</p>;
  }
  if (v.proposeOnly) {
    const n = v.proposed?.length;
    return (
      <section className={styles.hero} aria-label={v.phase === 'running' ? 'Planning wave' : 'Last wave'}>
        <h2>{v.phase === 'running' ? (n === undefined ? 'Planning' : 'Planned') : 'Last wave'} · {v.repo} wave {v.wave} · propose only</h2>
        <p className={styles.sub}>
          {n === undefined ? 'the plan has not answered yet' : `${n} item${n === 1 ? '' : 's'} proposed`} · {usd(v.costUsd)} spent. Plans the lanes, changes nothing: no branch, no lane, no commit.
        </p>
      </section>
    );
  }
  if (v.phase === 'last') {
    return (
      <section className={styles.hero} aria-label="Last wave">
        <h2>Last wave · {v.repo} wave {v.wave}</h2>
        <p className={styles.sub}>
          {v.landed} landed, {v.parked} parked, {v.failed} failed · {usd(v.costUsd)} spent. No wave is running.
        </p>
      </section>
    );
  }
  return (
    <section className={styles.hero} aria-label="Running lane" data-stale={v.stale ? '' : undefined}>
      <h2>{v.current?.title ?? 'Between lanes'}</h2>
      <p className={styles.sub}>
        {v.current ? `lane ${v.current.lane}` : 'no lane is open'} · {v.elapsedSec === undefined ? '-' : wall(v.elapsedSec)} · {usd(v.current?.costUsd)} so far
        {v.stale ? ' · frozen at the last event' : ''}
      </p>
    </section>
  );
}

/** A propose-only wave's plan items: proposed, never a landed, parked or failed colour. */
function ProposedRail({ items }: { items: readonly string[] }) {
  if (items.length === 0) return null;
  return (
    <ol className={styles.rail} aria-label="Proposed items">
      {items.map((id) => (
        <li key={id}>
          <Chip compact tone="neutral">proposed</Chip>
          <span className={styles.laneTitle}>{id}</span>
        </li>
      ))}
    </ol>
  );
}

/** The rail of the last finished lanes, newest first, each with its outcome. */
function LaneRail({ v }: { v: LiveView }) {
  if (v.proposeOnly) return <ProposedRail items={v.proposed ?? []} />;
  if (v.finished.length === 0) return null;
  return (
    <ol className={styles.rail} aria-label="Finished lanes">
      {v.finished.map((l) => (
        <li key={l.lane}>
          <Chip compact tone={l.outcome ? LANE_TONE[l.outcome] : 'unknown'}>{l.outcome}</Chip>
          <span className={styles.laneTitle}>{l.title ?? l.lane}</span>
          <span className={styles.laneFig}>{wall(l.wallSec)} · {usd(l.costUsd)}</span>
        </li>
      ))}
    </ol>
  );
}

/** `children` follow the rail (the pre-run panel, when no wave runs). */
export function LiveStage({ v, present, children }: { v: LiveView; present: boolean; children?: ReactNode }) {
  return (
    <div className={styles.stage} data-present={present ? '' : undefined}>
      <LiveHeader v={v} />
      <Hero v={v} />
      <LaneRail v={v} />
      {children}
    </div>
  );
}
