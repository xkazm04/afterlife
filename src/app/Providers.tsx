'use client';

import { useMemo, type ReactNode } from 'react';
import { ToastProvider } from '@/components/overlays/toast/ToastProvider';
import { ShellProvider, type ShellData } from '@/components/shell/ShellContext';
import { DevInspectorMount } from '@/lib/dev/inspector/DevInspectorMount';
import { TextSizeShortcuts } from '@/lib/settings/TextSizeShortcuts';

/** Client providers for the whole app: toasts and status messages, the shell's numbers (kept live), the text-size keys. */
export function Providers({ needsYouCount, data, children }: { needsYouCount: number; data: ShellData; children: ReactNode }) {
  // A new value is a new server read (the layout re-rendered): the sync adopts it and drops older answers, so keep it stable.
  const value = useMemo(() => ({ needsYouCount, data }), [needsYouCount, data]);
  return (
    <ToastProvider>
      <ShellProvider value={value} sync>
        <TextSizeShortcuts />
        <DevInspectorMount />
        {children}
      </ShellProvider>
    </ToastProvider>
  );
}
