'use client';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { Window } from '../Window';
import { navEntryFor } from '../sidebar/navItems';
import styles from './ShellLoading.module.css';

/**
 * The window while a screen's data streams in (`(app)/loading.tsx`). Inside the (app) layout's AppFrame it fills only the
 * right column - the frame and its sidebar are already there and stay - with the real toolbar and status bar, titled
 * from the route, so the screen fills it in place.
 */
export function ShellLoading() {
  // The pathname is request data on a dynamic route: the prerendered fallback is titled "Afterlife" until it is known.
  return (
    <Suspense fallback={<LoadingWindow title="Afterlife" />}>
      <RoutedLoading />
    </Suspense>
  );
}

function RoutedLoading() {
  return <LoadingWindow title={navEntryFor(usePathname())?.label ?? 'Afterlife'} />;
}

function LoadingWindow({ title }: { title: string }) {
  return (
    <Window title={title} subtitle="loading" status="Loading…">
      <div className={styles.pane} role="status" aria-busy="true" aria-label={`Loading ${title}`}>
        {Array.from({ length: 9 }, (_, i) => (
          <span key={i} className={styles.row} style={{ width: `${92 - ((i * 37) % 40)}%` }} />
        ))}
      </div>
    </Window>
  );
}
