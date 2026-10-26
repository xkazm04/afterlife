import { Stats } from '@/components/inspector/blocks/Stats';
import { Unread } from '@/components/shell/host';
import { Chip } from '@/components/status/chip/Chip';
import { pct, tokens, usd } from '../model/format';
import type { RunsData } from '@/lib/runs/types';
import stats from '@/components/inspector/blocks/Stats.module.css';
import styles from '../RunsScreen.module.css';

/** The strip before the runs are read: the same cells and figures, a dash in each (unknown is never 0). */
function HeaderPending() {
  const cell = (label: string) => (
    <div className={`${stats.cell} ${stats.plain}`}>
      <b>
        <Unread label={`${label} not read yet`} />
      </b>
      <span>{label}</span>
    </div>
  );
  const fig = (label: string) => (
    <div>
      <dt>{label}</dt>
      <dd>
        <Unread label={`${label} not read yet`} />
      </dd>
    </div>
  );
  return (
    <div className={styles.head} aria-busy="true">
      <div className={stats.prf}>
        {cell('waves')}
        {cell('lanes')}
        {cell('landed')}
      </div>
      <dl className={styles.figs}>
        {fig('landed')}
        {fig('tokens')}
        {fig('spent')}
      </dl>
    </div>
  );
}

/** The totals strip: waves, lanes, landed share, tokens, dollars. A figure no run reported reads "-", never 0. */
export function RunsHeader({ data }: { data?: RunsData }) {
  if (!data) return <HeaderPending />;
  const t = data.totals;
  return (
    <div className={styles.head}>
      <Stats cells={[{ n: t.waves, label: 'waves' }, { n: t.lanes, label: 'lanes' }, { n: t.counts.landed, label: 'landed', tone: 'ok' }]} />
      <dl className={styles.figs}>
        <div><dt>landed</dt><dd>{pct(t.landedPct)}</dd></div>
        <div><dt>tokens</dt><dd>{tokens(t.tokens)}</dd></div>
        <div><dt>spent</dt><dd>{usd(t.costUsd)}</dd></div>
      </dl>
      {data.skippedLines > 0 ? (
        <Chip tone="lag" title="Lines in .belay/runs that were not a belay.run/0 event. They are counted here and drawn nowhere.">
          {data.skippedLines} skipped line{data.skippedLines === 1 ? '' : 's'}
        </Chip>
      ) : null}
    </div>
  );
}
