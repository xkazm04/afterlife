'use client';

import type { ReactNode } from 'react';
import { InspectorSection } from '@/components/inspector/InspectorSection';

/** Which inspector sections are open: kept by the screen, so a selection change does not close what you opened. */
export interface SectionState {
  isOpen: (key: string, fallback: boolean) => boolean;
  setOpen: (key: string, open: boolean) => void;
}

/** An inspector section whose open state lives in `sections`. `anchor` gives it an id so Enter can scroll to it. */
export function Sec({
  id,
  title,
  aux,
  defaultOpen = true,
  anchor,
  sections,
  children,
}: {
  id: string;
  title: ReactNode;
  aux?: ReactNode;
  defaultOpen?: boolean;
  anchor?: string;
  sections: SectionState;
  children: ReactNode;
}) {
  return (
    <div id={anchor}>
      <InspectorSection title={title} aux={aux} open={sections.isOpen(id, defaultOpen)} onOpenChange={(o) => sections.setOpen(id, o)}>
        {children}
      </InspectorSection>
    </div>
  );
}
