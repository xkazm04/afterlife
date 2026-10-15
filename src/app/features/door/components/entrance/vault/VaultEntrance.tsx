'use client';

import { useEffect } from 'react';
import type { EntranceProps } from '../types';

/** Placeholder: the builder replaces it with the Vault door. */
export function VaultEntrance({ onOpen, onDone }: EntranceProps) {
  useEffect(() => {
    onOpen();
    onDone();
  }, [onOpen, onDone]);
  return null;
}
