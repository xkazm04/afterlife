'use client';

import { SegmentedControl, type SegmentOption } from '@/components/controls/toolbar/SegmentedControl';
import { TierMark } from '@/components/status/TierMark';
import { TIER_DISPLAY_ORDER, TIER_META } from '@/lib/tiers';
import type { Ceiling } from '../../model/types';

type Value = 'all' | Ceiling;

/** The tier filter: All, then H S A Q P with how many classes sit there. Keys 0-5 drive it too. */
export function TierFilter({ counts, total, value, onChange }: { counts: Record<Ceiling, number>; total: number; value: Ceiling | null; onChange: (t: Ceiling | null) => void }) {
  const options: SegmentOption<Value>[] = [
    { value: 'all', label: 'All', count: total, title: 'All tiers (0)' },
    ...TIER_DISPLAY_ORDER.map((t, i) => ({
      value: t,
      label: <TierMark tier={t} />,
      count: counts[t],
      title: `${TIER_META[t].name} (${i + 1})`,
      ariaLabel: `${TIER_META[t].name}, ${counts[t]}`,
    })),
  ];
  return <SegmentedControl label="Filter by tier" options={options} value={value ?? 'all'} onChange={(v) => onChange(v === 'all' ? null : v)} />;
}
