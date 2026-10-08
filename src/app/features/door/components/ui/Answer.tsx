'use client';

import Link from 'next/link';
import { memo } from 'react';
import type { District } from '../../model/city';
import { fmt, type FleetTotals, type MarkKind } from '../../model/words';
import { useCountUp } from '../../hooks/useCountUp';
import { MarkIcon } from './MarkIcon';
import styles from './answer.module.css';

const MARKS: readonly { kind: MarkKind; words: (t: FleetTotals, staleTop: District | null) => string; n: (t: FleetTotals) => number }[] = [
  { kind: 'stale', n: (t) => t.stale, words: (_, s) => ` stale${s ? ` · ${s.stale} in ${s.name}` : ''}` },
  { kind: 'quar', n: (t) => t.quar, words: () => ' classes quarantined' },
  { kind: 'setup', n: (t) => t.setup, words: () => ' setting up' },
  { kind: 'nsu', n: (t) => t.nsu, words: () => ' not watched · unknown, not zero' },
  { kind: 'watch', n: (t) => t.watch, words: () => ' watching' },
];

function Count({ n, delay, dur, intro }: { n: number; delay: number; dur: number; intro: boolean }) {
  return <>{fmt(useCountUp(n, delay, dur, intro))}</>;
}

/**
 * The answer, left of the city: the one loud number, who holds the most, then five drawn marks, the week's proofs and
 * the improvement cycles (a way into Cycles). Pointing at a mark lights its towers across the city; the number and
 * the stale mark open the district that holds the most of it.
 */
export const Answer = memo(function Answer({
  totals,
  tiers,
  staleTop,
  intro,
  tabbable,
  cycles,
  onMark,
  onOpen,
}: {
  totals: FleetTotals;
  /** Projects in improvement cycles, and the rungs those cycles have earned since day 0. */
  cycles: { projects: number; gained: number };
  tiers: { n: number; names: string[] }[];
  staleTop: District | null;
  intro: boolean;
  tabbable: boolean;
  onMark: (k: MarkKind | null) => void;
  onOpen: (k: 'needs' | 'stale') => void;
}) {
  const tab = tabbable ? 0 : -1;
  const lit = (k: MarkKind) => ({ onPointerEnter: () => onMark(k), onPointerLeave: () => onMark(null), onFocus: () => onMark(k), onBlur: () => onMark(null) });
  return (
    <section className={styles.answer} aria-label="The fleet at a glance" data-role="door-answer">
      <button type="button" className={styles.big} tabIndex={tab} data-role="door-big" aria-label={`${totals.needs} decisions wait for you`} onClick={() => onOpen('needs')} {...lit('needs')}>
        <Count n={totals.needs} delay={2400} dur={800} intro={intro} />
      </button>
      <div className={styles.bigSub} data-role="door-big-sub">
        decisions wait for you
      </div>
      <div className={styles.top}>
        {tiers.map((t) => (
          <div key={t.n}>
            <span className={styles.n}>{t.n}</span> each at{' '}
            {t.names.map((name, i) => (
              <span key={name}>
                {i ? ', ' : ''}
                <b>{name}</b>
              </span>
            ))}
          </div>
        ))}
      </div>
      <ul className={styles.marks}>
        {MARKS.map((m) => (
          <li key={m.kind}>
            <button type="button" className={styles.mk} tabIndex={tab} data-role="door-mark" onClick={() => m.kind === 'stale' && onOpen('stale')} {...lit(m.kind)}>
              <MarkIcon kind={m.kind} />
              <span>
                <b>
                  <Count n={m.n(totals)} delay={1200} dur={2000} intro={intro} />
                </b>
                {m.words(totals, staleTop)}
              </span>
            </button>
          </li>
        ))}
        <li>
          <span className={`${styles.mk} ${styles.proof}`}>
            <MarkIcon kind="proof" />
            <span>
              <b>
                <Count n={totals.pass} delay={1200} dur={2000} intro={intro} />
              </b>{' '}
              proofs passed this week ·{' '}
              <span className={styles.fl}>
                <Count n={totals.fail} delay={1200} dur={2000} intro={intro} />
              </span>{' '}
              failed
            </span>
          </span>
        </li>
        {cycles.projects ? (
          <li>
            <Link className={`${styles.mk} ${styles.proof} ${styles.link}`} href="/cycles" tabIndex={tab} data-role="door-cycles">
              <MarkIcon kind="cycle" />
              <span>
                <b>{cycles.projects}</b> in improvement cycles · <b>+{cycles.gained}</b> rungs since day 0
              </span>
            </Link>
          </li>
        ) : null}
      </ul>
    </section>
  );
});
