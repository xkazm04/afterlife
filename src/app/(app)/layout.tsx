import type { ReactNode } from 'react';
import { AppFrame } from '@/components/shell/frame/AppFrame';

// Every windowed screen shares one frame: the backdrop, the window box and the sidebar mount here once, so navigating
// between screens keeps the sidebar (and whether it is hidden); each screen's Window fills the right column.
export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppFrame>{children}</AppFrame>;
}
