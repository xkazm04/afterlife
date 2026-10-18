import Link from 'next/link';
import { Chip } from '@/components/status/chip/Chip';
import { usd } from '@/app/features/runs/model/format';
import type { LiveView } from '../model/types';
import styles from '../Live.module.css';

/** The LIVE badge, always visible: LIVE while the runner is talking, STALE when it has gone quiet, LAST WAVE with none running. */
export function LiveBadge({ v }: { v: LiveView }) {
  if (v.phase === 'running' && !v.stale) return <Chip tone="ok" title="Read from .belay/runs every 2 s: the runner is writing now">LIVE</Chip>;
  if (v.stale) return <Chip tone="lag" title="No event for over 30 s while a wave runs: the frame is frozen at the last event">LIVE · STALE</Chip>;
  return <Chip tone="neutral" title="No wave is running: the newest finished wave, as it ended">LAST WAVE</Chip>;
}

/** The four questions, answered from the folded data: running, doing what, going well, needs me. */
export function LiveHeader({ v }: { v: LiveView }) {
  const running = v.phase === 'running';
  return (
    <header className={styles.head}>
      <LiveBadge v={v} />
      <dl className={styles.facts}>
        <div>
          <dt>{running ? 'running' : 'ran'}</dt>
          <dd>{v.repo === undefined ? 'nothing yet' : `${v.repo} · wave ${v.wave}${running ? ` · lane ${v.laneN ?? v.lanesDone}/${v.lanesTotal}` : ` · ${v.lanesTotal} lanes`}`}</dd>
        </div>
        <div>
          <dt>doing what</dt>
          <dd>{running ? (v.current?.title ?? 'between lanes') : '-'}</dd>
        </div>
        <div>
          <dt>going well</dt>
          <dd>
            {v.landed} landed · {v.parked} parked · {v.failed} failed · {usd(v.costUsd)}
            {v.capUsd === undefined ? '' : ` of ${usd(v.capUsd)}`}
          </dd>
        </div>
        <div>
          <dt>needs me</dt>
          <dd>
            <Link href="/runs">{v.mergeable} mergeable wave{v.mergeable === 1 ? '' : 's'}</Link>
          </dd>
        </div>
      </dl>
    </header>
  );
}
