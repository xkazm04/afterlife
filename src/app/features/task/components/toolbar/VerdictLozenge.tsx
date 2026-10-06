import { Lozenge } from '@/components/controls/lozenge/Lozenge';
import { LozengeButton } from '@/components/controls/lozenge/LozengeButton';
import { LozengeDivider } from '@/components/controls/lozenge/LozengeDivider';
import type { VerdictFilter } from '../../model/docket/filters';
import styles from './toolbar.module.css';

/** The toolbar lozenge as a filter: all, pass only, fail only (also the f key). Filters only hide, they never change a task. */
export function VerdictLozenge({
  counts,
  value,
  onChange,
}: {
  counts: { all: number; pass: number; fail: number };
  value: VerdictFilter;
  onChange: (v: VerdictFilter) => void;
}) {
  return (
    <Lozenge label="Filter by verdict">
      <LozengeButton count={counts.all} word="all" pressed={value === 'all'} title="All verdicts" onClick={() => onChange('all')} />
      <LozengeDivider />
      <LozengeButton
        count={<span className={styles.ok}>✓ {counts.pass}</span>}
        word="pass"
        pressed={value === 'PASS'}
        title="Pass only"
        onClick={() => onChange('PASS')}
      />
      <LozengeDivider />
      <LozengeButton
        count={<span className={styles.bad}>✗ {counts.fail}</span>}
        word="fail"
        pressed={value === 'FAIL'}
        title="Fail only (f)"
        onClick={() => onChange('FAIL')}
      />
    </Lozenge>
  );
}
