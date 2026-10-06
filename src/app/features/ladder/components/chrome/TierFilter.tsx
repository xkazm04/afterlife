'use client';

// kit-candidate: SegmentedControl whose options are rich nodes (a tier mark and a count), not just a string.
import { useRef, type KeyboardEvent } from 'react';
import seg from '@/components/controls/toolbar/SegmentedControl.module.css';
import { TierMark } from '@/components/status/TierMark';
import { TIER_DISPLAY_ORDER, TIER_META } from '@/lib/tiers';
import type { Ceiling } from '../../model/types';
import styles from './chrome.module.css';

/** The tier filter: All, then H S A Q P with how many classes sit there. Keys 0-5 drive it too. */
export function TierFilter({ counts, total, value, onChange }: { counts: Record<Ceiling, number>; total: number; value: Ceiling | null; onChange: (t: Ceiling | null) => void }) {
  const group = useRef<HTMLDivElement>(null);
  const options: readonly (Ceiling | null)[] = [null, ...TIER_DISPLAY_ORDER];
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const i = options.indexOf(value);
    const next = options[(i + (e.key === 'ArrowRight' ? 1 : -1) + options.length) % options.length];
    onChange(next ?? null);
    e.preventDefault();
    requestAnimationFrame(() => group.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus());
  };
  return (
    <div ref={group} className={`${seg.seg} ${styles.tiers}`} role="radiogroup" aria-label="Filter by tier" onKeyDown={onKey}>
      <button type="button" role="radio" aria-checked={value === null} tabIndex={value === null ? 0 : -1} title="All tiers (0)" onClick={() => onChange(null)}>
        All <span className={styles.ct}>{total}</span>
      </button>
      {TIER_DISPLAY_ORDER.map((t, i) => (
        <button key={t} type="button" role="radio" aria-checked={value === t} tabIndex={value === t ? 0 : -1} title={`${TIER_META[t].name} (${i + 1})`} aria-label={`${TIER_META[t].name}, ${counts[t]}`} onClick={() => onChange(t)}>
          <TierMark tier={t} />
          <span className={styles.ct}>{counts[t]}</span>
        </button>
      ))}
    </div>
  );
}
