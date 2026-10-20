'use client';

import { useMemo, type ReactNode } from 'react';
import { ToastProvider } from '@/components/overlays/toast/ToastProvider';
import { CommandPalette } from '@/components/palette/CommandPalette';
import type { ProjectRef } from '@/components/palette/model/items';
import { ShellProvider, type ShellData } from '@/components/shell/ShellContext';
import { DevInspectorMount } from '@/lib/dev/inspector/DevInspectorMount';
import { TextSizeShortcuts } from '@/lib/settings/TextSizeShortcuts';

/**
 * Client providers for the whole app: toasts and status messages, the shell's numbers (kept live), the text-size keys,
 * and the ⌘K command palette over every project (read once by the layout; the palette is its only reader).
 */
export function Providers({
  needsYouCount,
  data,
  projects,
  children,
}: {
  needsYouCount: number;
  data: ShellData;
  projects: readonly ProjectRef[];
  children: ReactNode;
}) {
  // A new value is a new server read (the layout re-rendered): the sync adopts it and drops older answers, so keep it stable.
  const value = useMemo(() => ({ needsYouCount, data }), [needsYouCount, data]);
  return (
    <ToastProvider>
      <ShellProvider value={value} sync>
        <TextSizeShortcuts />
        <DevInspectorMount />
        <CommandPalette projects={projects} />
        {children}
      </ShellProvider>
    </ToastProvider>
  );
}
