import { LANE_TONE } from '@/app/features/runs/components/WaveState';
import { usd, wall } from '@/app/features/runs/model/format';
import { Chip } from '@/components/status/chip/Chip';
import type { LiveView } from '../model/types';
import { LiveHeader } from './LiveHeader';
import styles from '../Live.module.css';

/** The hero: the running lane (title, elapsed, cost so far). With no wave running there is no hero, only the summary. */
function Hero({ v }: { v: LiveView }) {
  if (v.phase === 'none') {
    return <p className={styles.empty}>No runs yet. A wave appears here the moment the runner writes its first event to .belay/runs.</p>;
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

/** The rail of the last finished lanes, newest first, each with its outcome. */
function LaneRail({ v }: { v: LiveView }) {
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

export function LiveStage({ v, present }: { v: LiveView; present: boolean }) {
  return (
    <div className={styles.stage} data-present={present ? '' : undefined}>
      <LiveHeader v={v} />
      <Hero v={v} />
      <LaneRail v={v} />
    </div>
  );
}
