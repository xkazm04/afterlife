import { Lozenge } from '@/components/controls/lozenge/Lozenge';
import { LozengeButton } from '@/components/controls/lozenge/LozengeButton';
import { LozengeDivider } from '@/components/controls/lozenge/LozengeDivider';
import { Unread } from '@/components/shell/host';
import type { VerdictFilter } from '../../model/docket/filters';
import styles from './toolbar.module.css';

/**
 * The toolbar lozenge as a filter: all, pass only, fail only (also the f key), or open (neither). Filters only hide, they
 * never change a task. `counts` absent (the docket not read yet): each count is a dash, never a zero.
 */
export function VerdictLozenge({
  counts,
  value,
  onChange,
}: {
  counts?: { all: number; pass: number; fail: number; open: number };
  value: VerdictFilter;
  onChange: (v: VerdictFilter) => void;
}) {
  const n = (k: 'all' | 'pass' | 'fail' | 'open') => (counts ? counts[k] : <Unread label={`${k} not read yet`} />);
  return (
    <Lozenge label="Filter by verdict">
      <LozengeButton count={n('all')} word="all" pressed={value === 'all'} title="All verdicts" onClick={() => onChange('all')} />
      <LozengeDivider />
      <LozengeButton
        count={<span className={styles.ok}>✓ {n('pass')}</span>}
        word="pass"
        pressed={value === 'PASS'}
        title="Pass only"
        onClick={() => onChange('PASS')}
      />
      <LozengeDivider />
      <LozengeButton
        count={<span className={styles.bad}>✗ {n('fail')}</span>}
        word="fail"
        pressed={value === 'FAIL'}
        title="Fail only (f)"
        onClick={() => onChange('FAIL')}
      />
      <LozengeDivider />
      <LozengeButton count={n('open')} word="open" pressed={value === 'open'} title="Open only: inconclusive or unknown, waiting on a person" onClick={() => onChange('open')} />
    </Lozenge>
  );
}
