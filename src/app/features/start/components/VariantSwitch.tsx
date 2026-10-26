'use client';

import { usePathname, useRouter } from 'next/navigation';
import { SegmentedControl } from '@/components/controls/toolbar/SegmentedControl';
import { HonestyChip } from '@/components/status/chip/HonestyChip';
import { VARIANT_KEYS, VARIANT_LABEL, type VariantKey } from '../variants/keys';

/** The presentation, a prototype choice (temporary: two are deleted once one is picked). Writes ?v=, keeps the rest. */
export function VariantSwitch({ value }: { value: VariantKey }) {
  const router = useRouter();
  const pathname = usePathname();
  const go = (v: VariantKey) => {
    const q = new URLSearchParams(window.location.search);
    if (v === 'focus') q.delete('v');
    else q.set('v', v);
    const s = q.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  };
  return (
    <>
      <HonestyChip kind="simulated" meaning="a prototype choice between three presentations of the same steps">
        prototype
      </HonestyChip>
      <SegmentedControl label="Presentation" value={value} onChange={go} options={VARIANT_KEYS.map((k) => ({ value: k, label: VARIANT_LABEL[k] }))} />
    </>
  );
}
