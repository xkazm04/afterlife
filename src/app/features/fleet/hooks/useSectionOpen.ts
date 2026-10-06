'use client';

import { useCallback, useState } from 'react';

export interface SectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Which inspector sections are open, kept across selections: a section you closed stays closed on the next
 * project. `section(key, defaultOpen)` returns the props for an InspectorSection.
 */
export function useSectionOpen() {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  return useCallback(
    (key: string, defaultOpen = true): SectionProps => ({
      open: open[key] ?? defaultOpen,
      onOpenChange: (o) => setOpen((s) => (s[key] === o ? s : { ...s, [key]: o })),
    }),
    [open],
  );
}
