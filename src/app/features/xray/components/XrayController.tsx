'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { onEscape } from '@/components/overlays/escapeLayers';
import { useHotkeys } from '@/lib/keyboard/useHotkeys';
import { XRAY_EVENT, useXray, xrayStore } from '../model/store';

/**
 * What switches the X-ray on and off, mounted once in the (app) layout: X (not while typing), Escape (as the top overlay
 * layer), the help popover's event, and `?xray=1` (the palette's "Show X-ray"). It never opens by itself: the first
 * visit to the demo opens the guide (features/guide).
 */
export function XrayController() {
  const x = useXray();

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
