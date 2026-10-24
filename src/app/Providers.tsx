'use client';

import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/overlays/toast/ToastProvider';
import { CommandPalette } from '@/components/palette/CommandPalette';
import { AdoptedShell } from '@/components/shell/live/ShellAdopt';
import { ShellProvider } from '@/components/shell/ShellContext';
import { DevInspectorMount } from '@/lib/dev/inspector/DevInspectorMount';
import { TextSizeShortcuts } from '@/lib/settings/TextSizeShortcuts';

/**
 * Client providers for the whole app: toasts and status messages, the shell's numbers (kept live), the text-size keys,
 * and the ⌘K command palette over every project (read apart from the shell, on the palette's first open: palette/projects.ts).
 * `read` is the layout's request-time shell read (ShellRead in <Suspense>); until it streams in, the shell is unknown.
 */
export function Providers({ read, children }: { read: ReactNode; children: ReactNode }) {
  // A new value is a new server read (ShellRead re-rendered with the layout): the sync adopts it and drops older answers.
  return (
    <ToastProvider>
      <AdoptedShell read={read}>
        {(info) => (
          <ShellProvider value={info} sync>
            <TextSizeShortcuts />
            <DevInspectorMount />
            <CommandPalette />
            {children}
          </ShellProvider>
        )}
      </AdoptedShell>
    </ToastProvider>
  );
}
