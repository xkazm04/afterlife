import { Button } from '@/components/controls/Button';
import { SegmentedControl } from '@/components/controls/toolbar/SegmentedControl';
import { outcomeWords, usd } from '../model/format';
import { ledgerCounts, type LedgerFilter, type LedgerRow } from '../model/ledger';
import type { MergeNeed } from '@/lib/runs/desk/types';
import type { RunWave } from '@/lib/runs/types';
import { WaveState } from './WaveState';
import styles from './ledger.module.css';

const LABEL: Record<LedgerFilter, string> = { all: 'All', landed: 'Landed', failed: 'Failed', parked: 'Parked', budget: 'Budget', timeout: 'Timeout', open: 'Running' };

/** Over the ledger: the outcome filter with each kind's count, and, while narrowed to one wave, which wave and a way back. */
export function LedgerBand({ rows, filter, onFilter, wave, needs, onClear }: {
  rows: readonly LedgerRow[];
  filter: LedgerFilter;
  onFilter: (f: LedgerFilter) => void;
  wave?: RunWave;
  needs?: readonly MergeNeed[];
  onClear: () => void;
}) {
  return (
    <div className={styles.band}>
      <SegmentedControl label="Lane outcome" value={filter} onChange={onFilter} options={ledgerCounts(rows).map((o) => ({ value: o.value, label: LABEL[o.value], count: o.count }))} />
      {wave ? (
        <div className={styles.only} role="status">
          <span>
            Wave {wave.wave} of <b>{wave.repo}</b>
          </span>
          <WaveState w={wave} needs={needs} />
          <span className={styles.dim}>
            {outcomeWords(wave.counts, wave.open)} · {usd(wave.costUsd)}
          </span>
          <Button size="mini" onClick={onClear}>
            All lanes
          </Button>
        </div>
      ) : null}
    </div>
  );
}
