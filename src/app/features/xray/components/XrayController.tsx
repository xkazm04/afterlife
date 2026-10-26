'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useHerePath } from '@/components/shell/host';
import { Suspense, useEffect } from 'react';
import { onEscape } from '@/components/overlays/escapeLayers';
import { useShellInfo } from '@/components/shell/ShellContext';
import { activeNavKey } from '@/components/shell/sidebar/navItems';
import { useHotkeys } from '@/lib/keyboard/useHotkeys';
import { stopOf } from '../callouts/tour';
import { XRAY_EVENT, useXray, xrayStore } from '../model/store';

/**
 * What switches the X-ray on and off, mounted once in the (app) layout: the first visit to the demo (a per-browser flag),
 * X (not while typing), Escape (as the top overlay layer), the help popover's event, and `?xray=1` (the palette's
 * "Show X-ray" and the sidebar's tour links). A screen it labels is marked seen once it has been shown.
 */
export function XrayController() {
  const x = useXray();
  const pathname = useHerePath();
  const { data } = useShellInfo();
  const key = stopOf(activeNavKey(pathname))?.key ?? null;

  useEffect(() => {
    if (data?.mode === 'demo' && xrayStore.takeFirstVisit()) xrayStore.setOn(true);
  }, [data?.mode]);

  useEffect(() => {
    if (x.on && key) xrayStore.markSeen(key);
  }, [x.on, key]);

  useEffect(() => {
    if (!x.on) return;
    return onEscape(() => xrayStore.setOn(false));
  }, [x.on]);

  useEffect(() => {
    const ask = () => xrayStore.setOn(true);
    window.addEventListener(XRAY_EVENT, ask);
    return () => window.removeEventListener(XRAY_EVENT, ask);
  }, []);

  useHotkeys([{ key: 'x', handler: () => xrayStore.toggle(), once: true }]);

  return (
    <Suspense fallback={null}>
      <XrayQuery />
    </Suspense>
  );
}

/** `?xray=1` on any screen: the X-ray opens on it. Behind its own Suspense: reading the query is client-only. */
function XrayQuery() {
  const ask = useSearchParams().get('xray') === '1';
  const pathname = usePathname();
  useEffect(() => {
    if (ask) xrayStore.setStep(pathname, 0);
  }, [ask, pathname]);
  return null;
}
