import type { ReactNode } from 'react';
import { DetailSection } from '@/components/shell/detail/DetailPage';

/** One card of the class page (a DetailSection under the name the section files already use). */
export function Sec({ title, aux, wide, children }: { title: string; aux?: ReactNode; wide?: boolean; children: ReactNode }) {
  return (
    <DetailSection title={title} aux={aux} wide={wide}>
      {children}
    </DetailSection>
  );
}
