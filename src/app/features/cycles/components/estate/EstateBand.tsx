import { Chip } from '@/components/status/chip/Chip';
import type { EstateData } from '../../model/estate/estate';
import styles from '../answer/answer.module.css';

/**
 * The estate's answer band: how many projects the cycles have reached and what they earned together. Its proof is
 * per project: each history, unwound to day 0 and replayed, must land on that project's rungs today.
 */
export function EstateBand({ data }: { data: EstateData }) {
  const all = data.reconciled === data.inCycles;
  return (
    <section className={styles.band} aria-label="Where the estate's cycles stand">
      <div className={styles.big}>
        <b>{data.inCycles}</b>
        <span>
          projects in cycles
          <em>
            {data.closed} cycles closed · {data.sum.net >= 0 ? '+' : ''}
            {data.sum.net} rungs net
          </em>
        </span>
      </div>
      <dl className={styles.facts}>
        <div>
          <dt>credited</dt>
          <dd>{data.sum.credited}</dd>
        </div>
        <div>
          <dt>not earned</dt>
          <dd>{data.sum.missed}</dd>
        </div>
        <div>
          <dt>drift caught</dt>
          <dd data-bad={data.sum.regressed > 0 || undefined}>{data.sum.regressed}</dd>
        </div>
      </dl>
      <div className={styles.proofs}>
        <Chip tone={all ? 'ok' : 'bad'} title="Each project's history, unwound to its day 0 and replayed, against its rungs today">
          {all ? '✓' : '✗'} {data.reconciled} of {data.inCycles} replay to their rungs
        </Chip>
        <Chip tone="neutral" title="Watching projects with no cycle record yet">
          {data.notCycling} watching, not in cycles
        </Chip>
      </div>
    </section>
  );
}
