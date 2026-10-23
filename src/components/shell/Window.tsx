'use client';

import { useState, type ReactNode } from 'react';
import { Icon } from '@/components/icons/Icon';
import { ToolbarButton } from '@/components/controls/toolbar/ToolbarButton';
import { HelpButton } from '@/components/overlays/HelpButton';
import { useModCap } from '@/lib/keyboard/modKey';
import { useHotkeys } from '@/lib/keyboard/useHotkeys';
import { Backdrop } from './Backdrop';
import { Inspector } from './bars/Inspector';
import { INSPECTOR_HOTKEY } from './bars/inspectorHotkey';
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
  /** The content pane, the page's one <main>. It is `position: relative` and clips: fill it with OutlineTable or a `.scroll`-style div. */
  children?: ReactNode;
}

/**
 * The macOS window every screen lives in: sidebar with the app navigation, toolbar, content pane, optional
 * inspector and status bar. The active nav item comes from the route. Cmd/Ctrl+I toggles the inspector.
 * Mount inside ToastProvider (the root layout does) so status messages reach the status bar. Ghostwire's backdrop
 * (circuit traces, the scan line) is drawn behind every window here; the front door, which has no window, has its own.
 */
export function Window(p: WindowProps) {
  const [sideOpen, setSideOpen] = useState(true);
  const [localInsp, setLocalInsp] = useState(p.defaultInspectorOpen ?? true);
  const mod = useModCap();
  const hasInsp = p.inspector !== undefined;
  const inspOpen = hasInsp && (p.inspectorOpen ?? localInsp);

  const setInsp = (open: boolean) => {
    if (p.inspectorOpen === undefined) setLocalInsp(open);
    p.onInspectorOpenChange?.(open);
  };
  useHotkeys([{ ...INSPECTOR_HOTKEY, handler: () => setInsp(!inspOpen) }], hasInsp);

  const cls = [styles.win, sideOpen ? '' : styles.noSide, inspOpen ? '' : styles.noInsp].filter(Boolean).join(' ');
  const inspToggle = hasInsp ? (
    <ToolbarButton pressed={inspOpen} title={`Inspector (${mod}I)`} aria-label="Toggle inspector" aria-controls="inspector" onClick={() => setInsp(!inspOpen)}>
      <Icon name="inspectorToggle" />
    </ToolbarButton>
  ) : null;

  const sideShow = sideOpen ? null : (
    <ToolbarButton title="Show sidebar" aria-label="Show sidebar" aria-expanded={false} onClick={() => setSideOpen(true)}>
      <Icon name="sidebarToggle" />
    </ToolbarButton>
  );

  return (
    <>
      <Backdrop />
      <div className={cls}>
        <Sidebar onToggle={() => setSideOpen((v) => !v)}>
          {p.sidebar}
        </Sidebar>
        <div className={styles.right}>
          <Toolbar title={p.title} subtitle={p.subtitle} lead={sideShow} end={inspToggle}>
            {p.toolbar}
          </Toolbar>
          <div className={styles.main}>
            <main className={styles.pane}>{p.children}</main>
            {hasInsp ? <Inspector open={inspOpen}>{p.inspector}</Inspector> : null}
          </div>
          <StatusBar help={p.help ? <HelpButton title={p.helpTitle}>{p.help}</HelpButton> : null}>{p.status}</StatusBar>
        </div>
      </div>
    </>
  );
}
