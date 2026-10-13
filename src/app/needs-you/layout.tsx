import type { ReactNode } from 'react';
import { loadNeedsYouView } from '../features/needs-you/data/pick';
import { NeedsStore } from '../features/needs-you/hooks/NeedsStore';

/** The desk's state lives here, above the list and the decision pages, so staging on a page reaches the list's outbox. */
export default function NeedsYouLayout({ children }: { children: ReactNode }) {
  const view = loadNeedsYouView();
  return view.kind === 'desk' ? <NeedsStore demo={view.demo}>{children}</NeedsStore> : children;
}
