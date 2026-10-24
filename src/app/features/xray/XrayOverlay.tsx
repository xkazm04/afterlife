'use client';

import { usePathname } from 'next/navigation';
import { useRef } from 'react';
import { activeNavKey } from '@/components/shell/sidebar/navItems';
import { stopOf } from './callouts/tour';
import { stepOn, useXray } from './model/store';
import { useParts } from './components/useParts';
import { XrayLayer } from './components/XrayLayer';
import { XrayPanel } from './components/XrayPanel';
import { XrayController } from './components/XrayController';
import styles from './components/xray.module.css';

const NONE: readonly never[] = [];

/**
 * The X-ray, as the (app) layout hands it to AppFrame: drawn inside the window box, over the real screen in front. Off, it
 * draws nothing but its controller (the keys and triggers).
 */
export function XrayOverlay() {
  const x = useXray();
  const path = usePathname();
  const stop = stopOf(activeNavKey(path));
  const active = stepOn(x, path);
  const ref = useRef<HTMLDivElement>(null);
  const layout = useParts(ref, stop?.callouts ?? NONE, active, x.on);
  return (
    <>
      <XrayController />
      {x.on ? (
        <div ref={ref} className={styles.layer} data-xray-layer>
          <XrayLayer layout={layout} active={active} />
          <XrayPanel stop={stop} parts={layout.parts} active={active} path={path} />
        </div>
      ) : null}
    </>
  );
}
