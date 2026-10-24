'use client';

import Link from 'next/link';
import { memo } from 'react';
import type { District } from '../../model/city';
import { MARK_LABEL } from '../../model/filter';
import { fmt, waits, waitWords, type FleetTotals, type MarkKind } from '../../model/words';
import { COUNT_BIG, COUNT_MARK, useCountUp } from '../../hooks/useCountUp';
import { MarkIcon } from './MarkIcon';
import styles from './answer.module.css';

// `quiet`: the mark is left out while its count is 0.
const MARKS: readonly { kind: MarkKind; words: (t: FleetTotals, staleTop: District | null) => string; n: (t: FleetTotals) => number; quiet?: boolean }[] = [
  { kind: 'stale', n: (t) => t.stale, words: (_, s) => ` stale${s && s.stale > 0 ? ` · ${s.stale} in ${s.name}` : ''}` },
  { kind: 'quar', n: (t) => t.quar, words: (t) => ` ${t.quar === 1 ? 'class' : 'classes'} quarantined` },
  { kind: 'norec', n: (t) => t.norec, words: (t) => ` ${t.norec === 1 ? 'class' : 'classes'} with no record yet · not quarantined`, quiet: true },
  { kind: 'split', n: (t) => t.split, words: (t) => ` ${t.split === 1 ? 'class' : 'classes'} split between agents · each at its own tier`, quiet: true },
  { kind: 'setup', n: (t) => t.setup, words: () => ' setting up' },
  { kind: 'nsu', n: (t) => t.nsu, words: () => ' not watched · unknown, not zero' },
  { kind: 'watch', n: (t) => t.watch, words: () => ' watching' },
];

function Count({ n, delay, dur, intro }: { n: number; delay: number; dur: number; intro: boolean }) {
  return <>{fmt(useCountUp(n, delay, dur, intro))}</>;
}

/**
 * The answer, left of the city, in one order: the one loud number and its words; one wrapping row of mark chips (the
 * filters); a rule; then the stats, who holds the most and the improvement cycles (a link into Cycles). Pointing at a
 * chip previews it across the city, clicking locks it as the filter and gives it a ✕ (again, or Esc, lets it go); the
 * number opens the district that holds the most.
 */
export const Answer = memo(function Answer({
  totals,
  tiers,
  staleTop,
  intro,
  tabbable,
  locked,
  cycles,
  onMark,
  onLock,
  onOpen,
}: {
  totals: FleetTotals;
  /** Projects in improvement cycles, and the net rungs those cycles have earned since day 0 (as /cycles counts them). */
  cycles: { projects: number; gained: number };
  tiers: { n: number; names: string[] }[];
  staleTop: District | null;
  intro: boolean;
  tabbable: boolean;
  locked: MarkKind | null;
  onMark: (k: MarkKind | null) => void;
  onLock: (k: MarkKind) => void;
  onOpen: (k: 'needs') => void;
}) {
  const tab = tabbable ? 0 : -1;
  const lit = (k: MarkKind) => ({ onPointerEnter: () => onMark(k), onPointerLeave: () => onMark(null), onFocus: () => onMark(k), onBlur: () => onMark(null) });
  return (
    <section className={styles.answer} aria-label="The fleet at a glance" data-role="door-answer">
      <button type="button" className={styles.big} tabIndex={tab} data-role="door-big" aria-label={`${waits(totals.needs)} for you. Open the district with the most.`} onClick={() => onOpen('needs')} {...lit('needs')}>
        <Count n={totals.needs} {...COUNT_BIG} intro={intro} />
      </button>
      <div className={styles.bigSub} data-role="door-big-sub">
        {waitWords(totals.needs)} for you
      </div>
      <ul className={styles.chips} aria-label="Filter the city">
        {MARKS.filter((m) => !m.quiet || m.n(totals) > 0).map((m) => (
          <li key={m.kind}>
            <button type="button" className={styles.chip} tabIndex={tab} data-role="door-mark" aria-pressed={locked === m.kind} onClick={() => onLock(m.kind)} {...lit(m.kind)}>
              <MarkIcon kind={m.kind} />
              <span>
                <b>
                  <Count n={m.n(totals)} {...COUNT_MARK} intro={intro} />
                </b>
                {m.words(totals, staleTop)}
              </span>
              {locked === m.kind ? (
                <span className={styles.x} aria-hidden title={`Clear the ${MARK_LABEL[m.kind]} filter`}>
                  ✕
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
      <hr className={styles.rule} />
      <div className={styles.stats}>
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
        {cycles.projects ? (
          <Link className={styles.cycles} href="/cycles" tabIndex={tab} data-role="door-cycles">
            <MarkIcon kind="cycle" />
            <span>
              <b>{cycles.projects}</b> in improvement cycles · <b>{cycles.gained >= 0 ? '+' : ''}{cycles.gained}</b> rungs since day 0
            </span>
          </Link>
        ) : null}
      </div>
    </section>
  );
});
