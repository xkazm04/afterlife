'use client';

import { useState } from 'react';
import { PaneScroll } from '@/components/shell/PaneScroll';
import { SidebarItem } from '@/components/shell/sidebar/SidebarItem';
import { SidebarSection } from '@/components/shell/sidebar/SidebarSection';
import { Window } from '@/components/shell/Window';
import { AboutSection } from './components/AboutSection';
import { KeyboardSection } from './components/KeyboardSection';
import { TextSizeSection } from './components/TextSizeSection';
import styles from './SettingsScreen.module.css';

// Add a setting by adding a section here: { id, label, node }.
const SECTIONS = [
  { id: 'text-size', label: 'Text size', node: <TextSizeSection /> },
  { id: 'keyboard', label: 'Keyboard', node: <KeyboardSection /> },
  { id: 'about', label: 'About', node: <AboutSection /> },
] as const;

export function SettingsScreen() {
  const [current, setCurrent] = useState<string>(SECTIONS[0].id);
  const jump = (id: string) => {
    setCurrent(id);
    document.getElementById(`settings-${id}`)?.scrollIntoView({ block: 'start' });
  };
  return (
    <Window
      title="Settings"
      subtitle="This device"
      sidebar={
        <SidebarSection title="Settings">
          {SECTIONS.map((s) => (
            <SidebarItem key={s.id} label={s.label} current={s.id === current} onClick={() => jump(s.id)} />
          ))}
        </SidebarSection>
      }
      status="Settings are saved in this browser"
    >
      <PaneScroll>
        <div className={styles.col}>
          {SECTIONS.map((s) => (
            <div key={s.id}>{s.node}</div>
          ))}
        </div>
      </PaneScroll>
    </Window>
  );
}
