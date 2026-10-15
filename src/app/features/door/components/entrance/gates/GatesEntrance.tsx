'use client';

import { useEffect } from 'react';
import type { EntranceProps } from '../types';

/** Placeholder: the builder replaces it with the Gates door. */
export function GatesEntrance({ onOpen, onDone }: EntranceProps) {
  useEffect(() => {
    onOpen();
    onDone();
  }, [onOpen, onDone]);
  return null;
}
