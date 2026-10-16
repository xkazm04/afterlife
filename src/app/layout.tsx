import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { getDataSource } from '@/server/data';
import { readShellInfo } from '@/server/data/shell/read';
import { DEFAULT_TEXT_SIZE } from '@/lib/settings/textSize';
import { TextSizeBoot } from '@/lib/settings/TextSizeBoot';
import { DoorFitBoot } from './features/door/components/chrome/FitBoot';
import { Providers } from './Providers';
import './globals.css';

// The data source is chosen per request (BELAY_MODE), so no page may be prerendered at build time.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Afterlife',
  description: 'Proof-carrying agents for the post-code lifecycle on GitLab.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // The shell's first paint; on navigation and focus the client re-reads the same function through /api/shell.
  const { needsYouCount, data } = readShellInfo(getDataSource());
  return (
    // data-text-size is rewritten by the boot script before first paint, hence suppressHydrationWarning.
    <html lang="en" data-text-size={DEFAULT_TEXT_SIZE} suppressHydrationWarning>
      <head>
        <TextSizeBoot />
        <DoorFitBoot />
      </head>
      <body>
        <Providers needsYouCount={needsYouCount} data={data}>{children}</Providers>
      </body>
    </html>
  );
}
