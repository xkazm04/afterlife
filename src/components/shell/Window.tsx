'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Icon } from '@/components/icons/Icon';
import { ToolbarButton } from '@/components/controls/toolbar/ToolbarButton';
import { HelpButton } from '@/components/overlays/HelpButton';
import { useHotkeys } from '@/lib/keyboard/useHotkeys';
import { Inspector } from './bars/Inspector';
import { Sidebar } from './sidebar/Sidebar';
import { StatusBar } from './bars/StatusBar';
import { Toolbar } from './bars/Toolbar';
import styles from './Window.module.css';

export interface WindowProps {
  /** Toolbar title (the screen name). */
  title: string;
  /** Dim line under the title, e.g. "acme-lab / ledgerline". */
  subtitle?: string;
  /** Toolbar controls, right of the title. Use <Spacer /> to push groups apart. */
  toolbar?: ReactNode;
  /** Extra sidebar sections below the app navigation (SidebarSection + SidebarItem). */
  sidebar?: ReactNode;
  /** Inspector content. Omit it and the window has no inspector and no toggle. */
  inspector?: ReactNode;
  /** Controlled inspector visibility; pair with onInspectorOpenChange. Omit for uncontrolled. */
  inspectorOpen?: boolean;
  defaultInspectorOpen?: boolean;
  onInspectorOpenChange?: (open: boolean) => void;
  /** Status bar text, left. */
  status?: ReactNode;
  /** Legend content: shows the "?" in the status bar, opening it in a popover. */
  help?: ReactNode;
  helpTitle?: string;
  /** The content pane. It is `position: relative` and clips: fill it with OutlineTable or a `.scroll`-style div. */
  children?: ReactNode;
}

/**
 * The macOS window every screen lives in: sidebar with the app navigation, toolbar, content pane, optional
 * inspector and status bar. The active nav item comes from the route. Cmd/Ctrl+I toggles the inspector.
 * Mount inside ToastProvider (the root layout does) so status messages reach the status bar.
 */
export function Window(p: WindowProps) {
  const [sideOpen, setSideOpen] = useState(true);
  const [localInsp, setLocalInsp] = useState(p.defaultInspectorOpen ?? true);
  const [active, setActive] = useState(true);
  const hasInsp = p.inspector !== undefined;
  const inspOpen = hasInsp && (p.inspectorOpen ?? localInsp);

  const setInsp = (open: boolean) => {
    if (p.inspectorOpen === undefined) setLocalInsp(open);
    p.onInspectorOpenChange?.(open);
  };
  useHotkeys([{ key: 'i', mod: true, handler: () => setInsp(!inspOpen) }], hasInsp);

  useEffect(() => {
    const on = () => setActive(true);
    const off = () => setActive(false);
    window.addEventListener('focus', on);
    window.addEventListener('blur', off);
    return () => {
      window.removeEventListener('focus', on);
      window.removeEventListener('blur', off);
    };
  }, []);

  const cls = [styles.win, sideOpen ? '' : styles.noSide, inspOpen ? '' : styles.noInsp].filter(Boolean).join(' ');
  const inspToggle = hasInsp ? (
    <ToolbarButton pressed={inspOpen} title="Inspector (⌘I)" aria-label="Toggle inspector" aria-controls="inspector" onClick={() => setInsp(!inspOpen)}>
      <Icon name="inspectorToggle" />
    </ToolbarButton>
  ) : null;

  return (
    <div className={cls}>
      <Sidebar active={active} onToggle={() => setSideOpen((v) => !v)}>
        {p.sidebar}
      </Sidebar>
      <div className={styles.right}>
        <Toolbar title={p.title} subtitle={p.subtitle} end={inspToggle}>
          {p.toolbar}
        </Toolbar>
        <div className={styles.main}>
          <div className={styles.pane}>{p.children}</div>
          {hasInsp ? <Inspector open={inspOpen}>{p.inspector}</Inspector> : null}
        </div>
        <StatusBar help={p.help ? <HelpButton title={p.helpTitle}>{p.help}</HelpButton> : null}>{p.status}</StatusBar>
      </div>
    </div>
  );
}
