'use client';

import { useCallback, useState } from 'react';

/**
 * Remembers which inspector sections are open by key, so picking another node keeps your layout:
 * spread `section('gates')` onto an InspectorSection. Sections are open by default.
 */
export function useOpenSections() {
  const [closed, setClosed] = useState<Readonly<Record<string, boolean>>>({});
  return useCallback(
    (key: string) => ({
      open: !closed[key],
      onOpenChange: (open: boolean) => setClosed((c) => (!!c[key] === !open ? c : { ...c, [key]: !open })),
    }),
    [closed],
  );
}

export type SectionProps = ReturnType<ReturnType<typeof useOpenSections>>;
