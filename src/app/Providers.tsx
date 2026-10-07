'use client';

import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/overlays/toast/ToastProvider';
import { ShellProvider, type ShellData } from '@/components/shell/ShellContext';
import { TextSizeShortcuts } from '@/lib/settings/TextSizeShortcuts';

/** Client providers for the whole app: toasts and status messages, the shell's numbers, the text-size keys. */
export function Providers({ needsYouCount, data, children }: { needsYouCount: number; data: ShellData; children: ReactNode }) {
  return (
    <ToastProvider>
      <ShellProvider value={{ needsYouCount, data }}>
        <TextSizeShortcuts />
        {children}
      </ShellProvider>
    </ToastProvider>
  );
}
