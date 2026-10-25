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
      {v.repo === undefined ? null : v.proposeOnly ? (
        <Chip tone="accent" title="--mode propose: each wave only plans; no branch, no lane, nothing committed">PROPOSE ONLY</Chip>
      ) : (
        <Chip tone="neutral" title="--mode execute: lanes edit, run the gates and commit what passes">EXECUTE</Chip>
      )}
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
            {v.proposeOnly ? `${v.proposed?.length ?? 0} proposed · nothing changed` : `${v.landed} landed · ${v.parked} parked · ${v.failed} failed`} · {usd(v.costUsd)}
            {v.capUsd === undefined ? '' : ` of ${usd(v.capUsd)}`}
          </dd>
        </div>
        <div>
          <dt>needs me</dt>
          <dd>
            <Link href="/runs">{v.mergeable} mergeable wave{v.mergeable === 1 ? '' : 's'}</Link>
          </dd>
        </div>
        <div>
          <dt>replay</dt>
          <dd>
            <Link href="/theater?live=0" title="Open the ledger replay film">
              Replay film
            </Link>
            {' · '}
            {v.replayable.length === 0 ? (
              'no finished wave yet'
            ) : (
              <>
                {v.replayable.length} finished wave{v.replayable.length === 1 ? '' : 's'}:{' '}
                {v.replayable.map((w, i) => (
                  <span key={`${w.repo}/${w.wave}`}>
                    {i > 0 ? ', ' : ''}
                    <Link href={`/theater?live=0&repo=${encodeURIComponent(w.repo)}&wave=${w.wave}`} title={`Show ${w.repo} wave ${w.wave} as it ended`}>
                      {w.repo} wave {w.wave}
                    </Link>
                  </span>
                ))}
              </>
            )}
          </dd>
        </div>
      </dl>
    </header>
  );
}
