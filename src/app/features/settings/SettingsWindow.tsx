'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { PaneScroll } from '@/components/shell/PaneScroll';
import { SidebarItem } from '@/components/shell/sidebar/SidebarItem';
import { SidebarSection } from '@/components/shell/sidebar/SidebarSection';
import { Window } from '@/components/shell/Window';
import { SETTINGS_PAGES, activeSettingsKey, settingsStatus } from './model/settingsNav';
import styles from './SettingsWindow.module.css';

/**
 * The window every Settings sub-page renders: the sidebar lists the sub-pages (current from the route), the pane
 * holds a heading, a one-line lede and the page's content. The status line says where this page's values live.
 */
export function SettingsWindow({ title, lede, children }: { title: string; lede: string; children: ReactNode }) {
  const current = activeSettingsKey(usePathname());
  return (
    <Window
      title="Settings"
      subtitle={title}
      sidebar={
        <SidebarSection title="Settings">
          {SETTINGS_PAGES.map((p) => (
            <SidebarItem key={p.key} href={p.href} label={p.label} current={p.key === current} />
          ))}
        </SidebarSection>
      }
      status={settingsStatus(current)}
    >
      <PaneScroll>
        <div className={styles.col}>
          <header className={styles.head}>
            <h1 className={styles.h}>{title}</h1>
            <p className={styles.lede}>{lede}</p>
          </header>
          {children}
        </div>
      </PaneScroll>
    </Window>
  );
}
