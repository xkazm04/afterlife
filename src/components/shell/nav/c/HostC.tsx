'use client';

// Arm C's host: the route's children and one kept-alive copy per sample screen, each in its own <Activity>, exactly one
// of them visible. A hidden copy (or the hidden route) keeps its state and DOM but runs no effects, so its timers and
// polls stop until it is shown again.
import { usePathname } from 'next/navigation';
import { Activity, useCallback, useRef, type ReactNode } from 'react';
import { ARM_SAMPLE_KEYS } from '../navArm';
import { copyShows, staleNote } from './model/registryRules';
import { useRegistry } from './registry';
import styles from './registry.module.css';
import { ScreenCopy } from './ScreenCopy';
import { useLanded } from './useLanded';
import { useRouteSignals } from './useRouteSignals';

export function HostC({ children }: { children?: ReactNode }) {
  const pathname = usePathname();
  const reg = useRegistry();
  // React detaches refs inside a hidden <Activity>; the host must still watch the hidden route, so null is ignored
  const routeRef = useRef<HTMLDivElement>(null);
  const keepRoute = useCallback((el: HTMLDivElement | null) => {
    if (el) routeRef.current = el;
  }, []);
  const landed = useLanded(routeRef, pathname, reg.active, reg.epoch);
  useRouteSignals(pathname, children, landed);
  const shown = ARM_SAMPLE_KEYS.find((k) => copyShows(k, reg.active, landed, reg.entries[k])) ?? null;

  return (
    <>
      <Activity mode={shown ? 'hidden' : 'visible'}>
        <div ref={keepRoute} className={styles.contents} data-arm-c-route="">
          {children}
        </div>
      </Activity>
      {ARM_SAMPLE_KEYS.map((k) => {
        const entry = reg.entries[k];
        // a copy is mounted once it has props (pre-rendered hidden, so a click only reveals it) or is the visible skeleton
        if (!entry.props && shown !== k) return null;
        return (
          <Activity key={k} mode={shown === k ? 'visible' : 'hidden'}>
            <ScreenCopy k={k} entry={entry} note={shown === k ? staleNote(k, entry) : null} />
          </Activity>
        );
      })}
    </>
  );
}
