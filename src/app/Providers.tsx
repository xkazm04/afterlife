'use client';

import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/overlays/toast/ToastProvider';
import { CommandPalette } from '@/components/palette/CommandPalette';
import type { ProjectRef } from '@/components/palette/model/items';
import { ShellProvider } from '@/components/shell/ShellContext';
import { TextSizeShortcuts } from '@/lib/settings/TextSizeShortcuts';

/** Client providers for the whole app: toasts and status messages, the shell's numbers, the text-size keys, ⌘K. */
export function Providers({ needsYouCount, projects, children }: { needsYouCount: number; projects: readonly ProjectRef[]; children: ReactNode }) {
  return (
    <ToastProvider>
      <ShellProvider value={{ needsYouCount, projects }}>
        <TextSizeShortcuts />
        <CommandPalette projects={projects} />
        {children}
      </ShellProvider>
    </ToastProvider>
  );
}
