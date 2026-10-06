'use client';

import { TEXT_SIZE_SPEC } from '@/lib/settings/textSize';
import { useTextSize } from '@/lib/settings/useTextSize';

/** --ui-scale as a number (1, 1.15 or 1.3), for the parts drawn in JS: the crag geometry. */
export function useUiScale(): number {
  const [size] = useTextSize();
  return TEXT_SIZE_SPEC[size].scale;
}
