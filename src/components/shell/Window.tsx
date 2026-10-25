'use client';

import { Suspense, useId, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/icons/Icon';
import { ToolbarButton } from '@/components/controls/toolbar/ToolbarButton';
import { HelpButton } from '@/components/overlays/HelpButton';
import { useModCap } from '@/lib/keyboard/modKey';
import { useHotkeys } from '@/lib/keyboard/useHotkeys';
import { AppFrame } from './frame/AppFrame';
import { useFrame, type Frame } from './frame/FrameContext';
import { Motion } from './frame/Motion';
import { DemoEstateBanner } from './bars/estate/DemoEstateBanner';
import { Inspector } from './bars/Inspector';
import { INSPECTOR_HOTKEY } from './bars/inspectorHotkey';
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
  /** The content pane, the page's one <main>. It is `position: relative` and clips: fill it with OutlineTable or PaneScroll. */
  children?: ReactNode;
}

/**
 * The macOS window every screen lives in: sidebar with the app navigation, toolbar, content pane, optional
 * inspector and status bar. The active nav item comes from the route. Cmd/Ctrl+I toggles the inspector.
 * Mount inside ToastProvider (the root layout does) so status messages reach the status bar.
 *
 * Inside the `(app)` layout's AppFrame (the backdrop, the box and the sidebar, kept across navigations) it draws only
 * the right column, animated in and out on navigation, and portals its `sidebar` sections into the frame's sidebar.
 * Rendered on its own (tests, a page outside the layout) it draws its own AppFrame around itself.
 */
export function Window(p: WindowProps) {
  const frame = useFrame();
  if (!frame) {
    return (
      <AppFrame sidebar={p.sidebar}>
        <WindowColumn {...p} sidebar={undefined} />
      </AppFrame>
    );
  }
  return <WindowColumn {...p} />;
}

function WindowColumn(p: WindowProps) {
  // Never null: Window renders this only inside a frame (the layout's, or its own).
  const frame = useFrame() as Frame;
  const [localInsp, setLocalInsp] = useState(p.defaultInspectorOpen ?? true);
  // Per instance: a route kept hidden in <Activity> may hold another window with an inspector at the same time.
  const inspId = `${useId()}inspector`;
  const mod = useModCap();
  const hasInsp = p.inspector !== undefined;
  const inspOpen = hasInsp && (p.inspectorOpen ?? localInsp);

  const setInsp = (open: boolean) => {
    if (p.inspectorOpen === undefined) setLocalInsp(open);
    p.onInspectorOpenChange?.(open);
  };
  // An effect: a screen hidden by <Activity> has its effects cleaned up, so its hotkeys stop with it.
  useHotkeys([{ ...INSPECTOR_HOTKEY, handler: () => setInsp(!inspOpen) }], hasInsp);

  const inspToggle = hasInsp ? (
    <ToolbarButton pressed={inspOpen} title={`Inspector (${mod}I)`} aria-label="Toggle inspector" aria-controls={inspId} onClick={() => setInsp(!inspOpen)}>
      <Icon name="inspectorToggle" />
    </ToolbarButton>
  ) : null;

  const sideShow = frame.sideOpen ? null : (
    <ToolbarButton title="Show sidebar" aria-label="Show sidebar" aria-expanded={false} onClick={() => frame.setSideOpen(true)}>
      <Icon name="sidebarToggle" />
    </ToolbarButton>
  );

  // The screen's sections join the frame's sidebar and leave with the screen; a hidden route's portal is hidden with it.
  const sections = p.sidebar !== undefined && frame.slot ? createPortal(<div>{p.sidebar}</div>, frame.slot) : null;

  return (
    <>
      {sections}
      <Motion enter="app-enter" exit="app-exit">
        <div className={`${styles.right} ${inspOpen ? '' : styles.noInsp}`}>
          <Toolbar title={p.title} subtitle={p.subtitle} lead={sideShow} end={inspToggle}>
            {p.toolbar}
          </Toolbar>
          {/* a row of its own, empty (0 high) unless this is a demo screen beside real projects */}
          <div>
            <Suspense fallback={null}>
              <DemoEstateBanner />
            </Suspense>
          </div>
          <div className={styles.main}>
            <main className={styles.pane}>{p.children}</main>
            {hasInsp ? <Inspector id={inspId} open={inspOpen}>{p.inspector}</Inspector> : null}
          </div>
          <StatusBar help={p.help ? <HelpButton title={p.helpTitle}>{p.help}</HelpButton> : null}>{p.status}</StatusBar>
        </div>
      </Motion>
    </>
  );
}
