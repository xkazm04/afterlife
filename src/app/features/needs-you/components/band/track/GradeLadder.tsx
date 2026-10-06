import { Fragment } from 'react';
import { GRADES, GRADE_NEVER } from '../../../data/cra';
import { gradeState } from '../../../model/clock/grades';
import { GradeChip } from '../../shared/GradeChip';
import styles from './track.module.css';

/** draft -> reviewable -> ready to sign, with "attested" struck out: Belay never says it. */
export function GradeLadder({ current }: { current: number }) {
  return (
    <div className={styles.bl}>
      <span className={styles.lbx}>Grade</span>
      {GRADES.map((g, i) => (
        <Fragment key={g.name}>
          <GradeChip state={gradeState(i, current)} title={`${g.name}: ${g.why}`}>
            {g.name}
          </GradeChip>
          {i < GRADES.length - 1 ? <span className={styles.ar}>→</span> : null}
        </Fragment>
      ))}
      <GradeChip state="never" title={`${GRADE_NEVER.name}: ${GRADE_NEVER.why}`}>
        {GRADE_NEVER.name}
      </GradeChip>
    </div>
  );
}
