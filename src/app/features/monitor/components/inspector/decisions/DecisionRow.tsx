'use client';

import { useId } from 'react';
import { Button } from '@/components/controls/Button';
import { Icon } from '@/components/icons/Icon';
import { Chip } from '@/components/status/chip/Chip';
import { KIND_WORDS } from '@/app/features/needs-you/data/week';
import { needsAction } from '@/lib/demo/needsActions';
import { TIER_META } from '@/lib/tiers';
import type { NeedsYouItem } from '@/lib/demo/types';
import styles from './decisions.module.css';

/** The move, in one line: the tier step and the scan's next change, whichever the item carries. */
function moveLine(d: NeedsYouItem): string {
  const step = d.from && d.to ? `${TIER_META[d.from].name} → ${TIER_META[d.to].name}` : '';
  return [step, d.change ?? ''].filter(Boolean).join(' · ');
}

/**
 * One decision of the deep project: a dense row (its kind, title and due time) that opens in place on a click, to what
 * it does, why, its rules and the decide buttons. Demo resolves it on the primary; live claims nothing: the one button
 * opens Needs you, where it is decided. A done item says so in its row and offers no buttons.
 */
export function DecisionRow({
  d,
  open,
  live,
  done,
  onToggle,
  onResolve,
  onFlash,
}: {
  d: NeedsYouItem;
  open: boolean;
  live: boolean;
  done: boolean;
  onToggle: () => void;
  onResolve: (needId: string, does: string) => void;
  onFlash: (message: string) => void;
}) {
  const bodyId = useId();
  const [primary, quiet] = needsAction(d.kind);
  const move = moveLine(d);
  const finished = done && !live;
  return (
    <div className={open ? `${styles.row} ${styles.open}` : styles.row}>
      <button type="button" className={styles.head} aria-expanded={open} aria-controls={bodyId} onClick={onToggle}>
        <Icon name="disc" className={styles.disc} />
        <Chip compact>{KIND_WORDS[d.kind] ?? d.kind}</Chip>
        <span className={styles.t} title={d.title}>
          {d.title}
        </span>
        {finished ? <span className={styles.due}>✓ Done</span> : d.dueIn ? <span className={styles.due}>{d.dueIn}</span> : null}
      </button>
      {open ? (
        <div id={bodyId} className={styles.body}>
          <p className={styles.does}>{d.does}</p>
          {d.reason ? <p className={styles.note}>Why: {d.reason}</p> : null}
          {move ? <p className={styles.note}>{move}</p> : null}
          {d.rules?.length ? (
            <ul className={styles.rules}>
              {d.rules.map(([rule, actual, met]) => (
                <li key={rule} data-met={met}>
                  <span className={styles.mark} role="img" aria-label={met ? 'met' : 'not met'}>
                    {met ? '✓' : '✗'}
                  </span>
                  <span className={styles.rule}>{rule}</span>
                  <span className={styles.actual}>{actual}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {finished ? null : (
            <div className={styles.acts}>
              {live ? (
                <Button variant="primary" href="/needs-you" title={`Opens Needs you, where this is decided; nothing is decided here. ${d.does}`}>
                  Decide in Needs you…
                </Button>
              ) : (
                <>
                  <Button variant="primary" title={d.does} onClick={() => onResolve(d.id, d.does)}>
                    {primary}
                  </Button>
                  <Button onClick={() => onFlash(`Deferred: ${d.title}`)}>{quiet}</Button>
                </>
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
