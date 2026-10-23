'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon } from '@/components/icons/Icon';
import { ToolbarButton } from '@/components/controls/toolbar/ToolbarButton';
import { AppNav } from './AppNav';
import { SettingsNav } from './SettingsNav';
import { TrafficLights } from './TrafficLights';
import styles from './Sidebar.module.css';

/**
 * The source-list sidebar: lights, the Afterlife home link and the hide button on top, the app navigation, then the screen's own sections
 * (`children`), and Settings pinned at the bottom.
 */
export function Sidebar({ onToggle, children }: { onToggle: () => void; children?: ReactNode }) {
  return (
    <aside className={styles.side} aria-label="Sources">
      <div className={styles.top}>
        <TrafficLights />
        <Link href="/" className={styles.brand} aria-label="Afterlife, back to the landing page">
          <Image src="/brand/belay-b-knot.svg" alt="" width={18} height={18} unoptimized />
          <span>Afterlife</span>
        </Link>
        <span className={styles.push}>
          <ToolbarButton title="Hide sidebar" aria-label="Hide sidebar" onClick={onToggle}>
            <Icon name="sidebarToggle" />
          </ToolbarButton>
        </span>
      </div>
      <AppNav />
      <div className={styles.src}>{children}</div>
      <SettingsNav />
    </aside>
  );
}
