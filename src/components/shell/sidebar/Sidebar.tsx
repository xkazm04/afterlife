'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRef, type ReactNode, type Ref } from 'react';
import { Icon } from '@/components/icons/Icon';
import { ToolbarButton } from '@/components/controls/toolbar/ToolbarButton';
import { useFrame } from '../frame/FrameContext';
import { AppNav } from './AppNav';
import { NestedHead } from './levels/NestedHead';
import { SettingsNav } from './SettingsNav';
import { TrafficLights } from './TrafficLights';
import styles from './Sidebar.module.css';
import lv from './levels/levels.module.css';

/**
 * The source-list sidebar: lights, the Afterlife home link and the hide button on top, then two levels on one sliding
 * track, and Settings pinned at the bottom. Level one is the app menu (its groups, then `extras`: the layout's help
 * section). Level two is the screen in front's own sections (`slotRef`, where Window portals them) under a way back and
 * the screen's name, so a screen's filters and lists get the whole column. The frame says which level shows; outside a
 * frame (a Window drawn on its own) there is only level one.
 */
export function Sidebar({ onToggle, extras, slotRef }: { onToggle: () => void; extras?: ReactNode; slotRef?: Ref<HTMLDivElement> }) {
  const frame = useFrame();
  const level = frame?.level ?? 1;
  const back = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const toMenu = () => {
    frame?.setLevel(1);
    // focus follows the person to the menu, onto the screen they came from
    requestAnimationFrame(() => menu.current?.querySelector<HTMLElement>('[aria-current="page"]')?.focus({ preventScroll: true }));
  };
  const toNested = () => {
    frame?.setLevel(2);
    requestAnimationFrame(() => back.current?.focus({ preventScroll: true }));
  };
  return (
    <aside className={styles.side} aria-label="Sources">
      <div className={styles.top}>
        <TrafficLights />
        <Link href="/" className={styles.brand} aria-label="Afterlife, back to the landing page">
          <Image src="/brand/afterlife-b-knot.svg" alt="" width={18} height={18} unoptimized />
          <span>Afterlife</span>
        </Link>
        <span className={styles.push}>
          <ToolbarButton title="Hide sidebar" aria-label="Hide sidebar" onClick={onToggle}>
            <Icon name="sidebarToggle" />
          </ToolbarButton>
        </span>
      </div>
      <div className={lv.levels}>
        <div className={lv.track} data-level={level}>
          <div ref={menu} className={lv.pane} inert={level !== 1} data-sidebar-pane="menu">
            <div className={lv.menu}>
              <AppNav onOpenCurrent={frame?.nested ? toNested : undefined} />
              <div className={lv.extras}>{extras}</div>
            </div>
          </div>
          <div className={lv.pane} inert={level !== 2} data-sidebar-pane="screen">
            <NestedHead onBack={toMenu} backRef={back} />
            <div className={styles.src} ref={slotRef} />
          </div>
        </div>
      </div>
      <SettingsNav />
    </aside>
  );
}
