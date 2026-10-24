import { ObjectLink } from '@/components/controls/ObjectLink';
import { Chip } from '@/components/status/chip/Chip';
import { HonestyChip } from '@/components/status/chip/HonestyChip';
import type { CheckKind, TaskCheck, TaskView } from '../../model/types';
import { linkLabel, type Emphasis } from '../../model/court/selection';
import { KIND_GLYPH } from '../../model/verdict/verdict';
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
    <div data-check-card={check.id} aria-hidden={landed ? undefined : true} className={cls}>
      {/* The select control is a sibling of the evidence link, stretched over the card: a link inside a button is not reachable. */}
      <button
        type="button"
        className={styles.pick}
        tabIndex={landed ? 0 : -1}
        aria-pressed={emphasis === 'sel'}
        aria-label={`${check.id}: ${check.text}`}
        onClick={onSelect}
      />
      <div className={styles.top}>
        <span className={styles.nm}>
          <span className={styles.g}>{KIND_GLYPH[kind]}</span>
          {check.id}
        </span>
        {check.claims.length ? null : (
          <Chip tone="invariant" title="no claim asked for it; the engine checks it on every task of this class">
            invariant
          </Chip>
        )}
        {/* It names a claim this proof does not hold, so no tie can be drawn to it. */}
        {check.claims.some((cid) => !task.claims.some((c) => c.id === cid)) ? <HonestyChip kind="unknown">claim not held</HonestyChip> : null}
      </div>
      <div className={styles.txt}>{check.text}</div>
      <div className={styles.meta}>
        <span className={styles.lnk}>
          <ObjectLink target={check.ref} />
        </span>
        <span>{linkLabel(task, check.link)}</span>
      </div>
    </div>
  );
}
