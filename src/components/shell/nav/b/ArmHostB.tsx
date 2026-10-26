'use client';

// Arm B's host (legacy, until W1/W2): the route's page (children) and one <Activity> per visited list screen. A click on
// the Fleet or Needs-you list (handed over by the screen host's click delegation) pushes the URL and swaps the screen
// here (no router navigation, no RSC request); leaving hides a screen with its state (selection, filters, scroll), and returning shows it at once while a quiet re-read swaps its props.
// Detail pages, other tabs, a direct load or a reload stay the route's: the host draws only its own history entries.
import { usePathname, useRouter } from 'next/navigation';
import { Activity, useEffect, type ReactNode } from 'react';
import { setLegacy } from '@/components/shell/host/hooks/navigation';
import { DOC_TITLE, listKeyOf } from './model';
import { HostScreen } from './HostScreen';
import { HOST_KEYS, keepOrSync, navigateTo, setActive, syncFromHistory, unmarkCurrent, useHostState } from './store';

// Registered once, at module load, not in an effect: while the screen host shows one of its own screens this host sits in
// a hidden <Activity> (its effects cleaned up), and a list link must still reach it. A reload's own mark goes once.
setLegacy({ takes: (href) => listKeyOf(href) !== null, navigate: navigateTo });
let unmarked = false;

export function ArmHostB({ children }: { children?: ReactNode }): ReactNode {
  const pathname = usePathname();
  const router = useRouter();
  const { active, entries } = useHostState();

  useEffect(() => {
    if (!unmarked) unmarkCurrent();
    unmarked = true;
    window.addEventListener('popstate', syncFromHistory);
    return () => window.removeEventListener('popstate', syncFromHistory);
  }, []);
  // A router navigation (a row into /fleet/<id>, a non-sample tab) lands on an entry without the host's mark: step aside.
  // A refresh or an HMR update on the host's own URL rewrites the entry's state without the mark: the host keeps it.
  useEffect(() => keepOrSync(pathname));

  const activeKey = active ? listKeyOf(active) : null;
  const entry = activeKey ? entries[activeKey] : undefined;
  // no props to draw, or a veiled Needs you whose re-read failed: the route draws the truth (or says why it cannot)
  const fallback = entry?.error !== undefined && (!entry.env || entry.veiled);
  useEffect(() => {
    if (!fallback) return;
    setActive(null, '');
    router.replace(window.location.pathname + window.location.search);
  }, [fallback, router]);
  useEffect(() => {
    if (activeKey) document.title = DOC_TITLE[activeKey];
  }, [activeKey]);

  return (
    <>
      <Activity mode={activeKey ? 'hidden' : 'visible'}>{children}</Activity>
      {HOST_KEYS.map((k) =>
        entries[k] ? (
          <Activity key={k} mode={k === activeKey ? 'visible' : 'hidden'}>
            <HostScreen k={k} entries={entries} />
          </Activity>
        ) : null,
      )}
    </>
  );
}
