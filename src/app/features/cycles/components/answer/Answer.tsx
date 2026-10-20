import { Chip } from '@/components/status/chip/Chip';
import type { CyclesData } from '../../model/build';
import { MAX_TOTAL, summarize, total } from '../../model/replay';
import styles from './answer.module.css';

/**
 * The answer band: how far the cycles have taken the project, and why the number can be believed. The two proofs are
 * re-derived on every render: the replayed history equals the latest scan, and every change starts where the last
 * one left its stage.
 */
export function Answer({ data }: { data: CyclesData }) {
  const closed = data.cycles.filter((c) => c.state === 'closed');
  const now = total(data.scanned);
  const gained = now - total(data.day0);
  const sums = closed.map(summarize);
  const credited = sums.reduce((n, s) => n + s.credited, 0);
  const missed = sums.reduce((n, s) => n + s.missed, 0);
  const regressed = sums.reduce((n, s) => n + s.regressed, 0);
  const reconciles = data.drift.length === 0;
  const chain = data.breaks.length === 0;
  return (
    <section className={styles.band} aria-label="Where the cycles stand">
      <div className={styles.big}>
        <b>{now}</b>
        <span>
          of {MAX_TOTAL} rungs
          <em>
            +{gained} since day 0 · {closed.length} cycles
          </em>
        </span>
      </div>
      <dl className={styles.facts}>
        <div>
          <dt>credited</dt>
          <dd>{credited}</dd>
        </div>
        <div>
          <dt>not earned</dt>
          <dd>{missed}</dd>
        </div>
        <div>
          <dt>drift caught</dt>
          <dd data-bad={regressed > 0 || undefined}>{regressed}</dd>
        </div>
      </dl>
      <div className={styles.proofs}>
        <Chip tone={reconciles ? 'ok' : 'bad'} title="Day 0 plus every closed cycle's verdicts, replayed, against the latest scan">
          {reconciles ? '✓' : '✗'} replay = {data.scannedAt} scan
          {reconciles ? '' : ` · off on ${data.drift.join(', ')}`}
        </Chip>
        <Chip tone={chain ? 'ok' : 'bad'} title={chain ? 'Every change starts at the rung the replay holds for its stage' : data.breaks.map((b) => `${b.cycle} ${b.stage}: ${b.text}`).join('\n')}>
          {chain ? '✓ chain holds' : `✗ ${data.breaks.length} break${data.breaks.length === 1 ? '' : 's'}`}
        </Chip>
        <Chip tone="invariant" title="Credit never crosses engine versions">
          engine {data.engine}
        </Chip>
      </div>
    </section>
  );
}
