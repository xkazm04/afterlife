'use client';

import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/overlays/toast/ToastProvider';
import { CommandPalette } from '@/components/palette/CommandPalette';
import { ShellProvider, useShellInfo, type ShellInfo } from '@/components/shell/ShellContext';
import { DevInspectorMount } from '@/lib/dev/inspector/DevInspectorMount';
import { TextSizeShortcuts } from '@/lib/settings/TextSizeShortcuts';

/**
 * Client providers for the whole app: toasts and status messages, the shell's numbers (kept live), the text-size keys,
 * and the ⌘K command palette over every project (read with the shell, so it re-reads on navigation and focus like the badge).
 */
export function Providers({ info, children }: { info: ShellInfo; children: ReactNode }) {
  // A new value is a new server read (the layout re-rendered): the sync adopts it and drops older answers.
  return (
    <ToastProvider>
      <ShellProvider value={info} sync>
        <TextSizeShortcuts />
        <DevInspectorMount />
        <ShellPalette />
        {children}
      </ShellProvider>
    </ToastProvider>
  );
}

/** The palette over the shell's current projects (inside the provider, so it follows the sync). */
function ShellPalette() {
  return <CommandPalette projects={useShellInfo().projects} />;
}
