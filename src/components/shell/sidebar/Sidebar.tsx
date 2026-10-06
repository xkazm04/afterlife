'use client';

import type { ReactNode } from 'react';
import { Icon } from '@/components/icons/Icon';
import { ToolbarButton } from '@/components/controls/toolbar/ToolbarButton';
import { AppNav } from './AppNav';
import { SettingsNav } from './SettingsNav';
import { TrafficLights } from './TrafficLights';
import styles from './Sidebar.module.css';

/**
 * The source-list sidebar: lights and the hide button on top, the app navigation, then the screen's own sections
 * (`children`), and Settings pinned at the bottom.
 */
export function Sidebar({ active, onToggle, children }: { active: boolean; onToggle: () => void; children?: ReactNode }) {
  return (
    <aside className={styles.side} aria-label="Sources">
      <div className={styles.top}>
        <TrafficLights active={active} />
        <span className={styles.push}>
          <ToolbarButton title="Hide sidebar" aria-label="Toggle sidebar" onClick={onToggle}>
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
