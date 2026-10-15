'use client';

import { useEffect } from 'react';
import { ENTRANCES } from './variants';
import type { EntranceId, EntranceProps } from './types';

/**
 * The landing page's entrance: one prototype door over the city, server-rendered so the city never flashes first.
 * Under reduced motion there is no ceremony: each door hides itself in CSS, and the harness opens and finishes at once.
 */
export function Entrance({ id, onOpen, onDone }: EntranceProps & { id: EntranceId }) {
  useEffect(() => {
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    onOpen();
    onDone();
  }, [onOpen, onDone]);
  const { Door } = ENTRANCES[id];
  return <Door onOpen={onOpen} onDone={onDone} />;
}
