'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { useDemo } from '../hooks/useDemo';
import { useGuideKeys } from '../hooks/useGuideKeys';
import { STEP_MS, autoAdvances } from '../model/playback';
import { GUIDE_EVENT, guideStore, type GuideState } from '../model/store';

/**
 * What starts, stops and paces the guide, mounted once in the (app) layout: the first visit to the demo (a per-browser
 * flag), G, the help popover's event, `?guide=1` (the palette's "Watch the guide"), and the autoplay timer, which holds
 * while the tab is hidden. The guide replays the demo estate, so it only opens on demo data.
 */
export function GuideController({ g }: { g: GuideState }) {
  const demo = useDemo();

  useEffect(() => {
    if (demo && guideStore.takeFirstVisit()) guideStore.open();
  }, [demo]);

  useEffect(() => {
    if (!demo) return;
    const ask = () => guideStore.open();
    window.addEventListener(GUIDE_EVENT, ask);
    return () => window.removeEventListener(GUIDE_EVENT, ask);
  }, [demo]);

  useEffect(() => {
    if (!demo) guideStore.close();
  }, [demo]);

  const auto = g.on && autoAdvances(g);
  const at = g.i;
  useEffect(() => {
    if (!auto) return;
    const t = window.setTimeout(() => {
      if (!document.hidden) guideStore.send({ type: 'tick', at });
      else guideStore.send({ type: 'toggle' }); // a hidden tab pauses rather than playing on unseen
    }, STEP_MS);
    return () => window.clearTimeout(t);
  }, [auto, at, g.run]);

  useGuideKeys(g.on && demo, demo);

  return (
    <Suspense fallback={null}>
      <GuideQuery demo={demo} />
    </Suspense>
  );
}

/** `?guide=1` on any screen opens the guide (on the demo). Behind its own Suspense: reading the query is client-only. */
function GuideQuery({ demo }: { demo: boolean }) {
  const ask = useSearchParams().get('guide') === '1';
  useEffect(() => {
    if (ask && demo) guideStore.open();
  }, [ask, demo]);
  return null;
}
