import type { CSSProperties } from 'react';
import { ACTS, STEPS, type Act } from '../model/steps';
import { STEP_MS } from '../model/playback';
import styles from './rail.module.css';

const N = STEPS.length;
const ACT_CLASS: Record<Act, string> = { travel: '', wrong: styles.bad ?? '', you: styles.you ?? '' };
/** Where step k's stop sits along the rail, as a share of its width: stops are equal columns, so a centre is (k + ½) / N. */
const at = (k: number): string => `${((k + 0.5) / N) * 100}%`;

/**
 * The rail: one stop per step in its act's light (cyan, the pink of things going wrong, amber where it is yours), the
 * travelled line, and while autoplay runs a bar that fills toward the next stop over the step's hold. The acts sit under
 * it on the same columns, so they line up without measuring.
 */
export function Rail({ i, running, entry, onGo }: { i: number; running: boolean; entry: string; onGo: (k: number) => void }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.rail}>
        <span className={styles.ln} style={{ left: at(0), right: at(0) }} />
        <span className={styles.fill} style={{ left: at(0), width: `${(i / N) * 100}%` }} />
        {running ? (
          <span key={entry} className={styles.run} style={{ left: at(i), width: `${100 / N}%`, '--step-ms': `${STEP_MS}ms` } as CSSProperties} />
        ) : null}
        {STEPS.map((s, k) => (
          <button
            key={s.key}
            type="button"
            className={`${styles.stop} ${ACT_CLASS[s.act]} ${k < i ? styles.done : ''} ${k === i ? styles.now : ''}`}
            aria-label={`Step ${k + 1}: ${s.label}`}
            aria-current={k === i ? 'step' : undefined}
            onClick={() => onGo(k)}
          >
            <i />
            <span>{s.label}</span>
          </button>
        ))}
      </div>
      <div className={styles.acts} aria-hidden="true">
        {ACTS.map((a) => (
          <span key={a.act} style={{ flex: `${a.steps} 1 0` }}>
            {a.label}
          </span>
        ))}
      </div>
    </div>
  );
}
