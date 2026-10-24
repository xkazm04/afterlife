import { Suspense, type ReactNode } from 'react';
import { ScreenSkeleton } from '@/components/shell/loading/ScreenSkeleton';
import { loadNeedsYouView } from '@/app/features/needs-you/data/pick';
import { NeedsStore } from '@/app/features/needs-you/hooks/NeedsStore';
import { connection } from 'next/server';

/**
 * The desk's state lives here, above the list and the decision pages, so staging on a page reaches the list's outbox.
 * The read streams: the layout itself never waits, so a navigation into /needs-you paints the desk's skeleton at once. The
 * store mounts once with the layout and stays mounted while the viewer moves between the list and a decision's page.
 */
export default function NeedsYouLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<ScreenSkeleton title="Needs you" layout="table" />}>
      <NeedsDesk>{children}</NeedsDesk>
    </Suspense>
  );
}

async function NeedsDesk({ children }: { children: ReactNode }) {
  await connection(); // request time: the data source and its data are the running server's, never the build's
  const view = loadNeedsYouView();
  return view.kind === 'desk' ? <NeedsStore demo={view.demo}>{children}</NeedsStore> : children;
}
