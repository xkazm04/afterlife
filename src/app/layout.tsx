import type { Metadata } from 'next';
import { Suspense, type ReactNode } from 'react';
import { ShellRead } from '@/components/shell/live/ShellRead';
import { DEFAULT_TEXT_SIZE } from '@/lib/settings/textSize';
import { TextSizeBoot } from '@/lib/settings/TextSizeBoot';
import { DoorFitBoot } from './features/door/components/chrome/FitBoot';
import { Providers } from './Providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Afterlife',
  description: 'Proof-carrying agents for the post-code lifecycle on GitLab.',
};

// Static shell + dynamic holes: <html>, <head> and its boot scripts are prerendered; the shell's data read (ShellRead) waits
// for a request inside <Suspense>, since the data source is chosen per request (BELAY_MODE). Until it streams in the
// chrome shows PENDING_SHELL (unknown, never demo); on navigation and focus the client re-reads /api/shell.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // data-text-size is rewritten by the boot script before first paint, hence suppressHydrationWarning.
    <html lang="en" data-text-size={DEFAULT_TEXT_SIZE} suppressHydrationWarning>
      <head>
        <TextSizeBoot />
        <DoorFitBoot />
      </head>
      <body>
        <Providers
          read={
            <Suspense fallback={null}>
              <ShellRead />
            </Suspense>
          }
        >
          {children}
        </Providers>
      </body>
    </html>
  );
}
