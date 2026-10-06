import { ObjectLink } from '../ObjectLink';
import { Chip } from '../Chip';
import type { CheckKind, TaskCheck, TaskView } from '../../model/types';
import type { Emphasis } from '../../model/court/selection';
import { checkGlyph } from '../../model/verdict/verdict';
import { activateOnKey } from './ClaimCard';
import styles from './cards.module.css';

const KIND_CLASS: Record<CheckKind, string> = { ok: styles.check_ok ?? '', bad: styles.check_bad ?? '', unk: styles.check_unk ?? '' };

/** A check from the model-free proof engine: the only thing that decides. Hidden (not removed) until a replay reaches it. */
export function CheckCard({
  task,
  check,
  kind,
  emphasis,
  landed,
  onSelect,
}: {
  task: TaskView;
  check: TaskCheck;
  kind: CheckKind;
  emphasis: Emphasis;
  landed: boolean;
  onSelect: () => void;
}) {
  const cls = [styles.cd, styles.check, KIND_CLASS[kind], styles[emphasis], landed ? '' : styles.hidden].filter(Boolean).join(' ');
  return (
    <div
      role="button"
      tabIndex={landed ? 0 : -1}
      data-check-card={check.id}
      aria-pressed={emphasis === 'sel'}
      aria-hidden={landed ? undefined : true}
      className={cls}
      onClick={onSelect}
      onKeyDown={(e) => activateOnKey(e, onSelect)}
    >
      <div className={styles.top}>
        <span className={styles.nm}>
          <span className={styles.g}>{checkGlyph(check.ok)}</span>
          {check.id}
        </span>
        {check.claims.length ? null : (
          <Chip tone="invariant" title="no claim asked for it; the engine checks it on every task of this class">
            invariant
          </Chip>
        )}
      </div>
      <div className={styles.txt}>{check.text}</div>
      <div className={styles.meta}>
        <span>
          <ObjectLink target={check.ref} />
        </span>
        <span>
          link {check.link + 1} · {task.chain[check.link]?.step}
        </span>
      </div>
    </div>
  );
}
