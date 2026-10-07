import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { getDataSource, readDataConfig } from '@/server/data';
import { DEFAULT_TEXT_SIZE } from '@/lib/settings/textSize';
import { TextSizeBoot } from '@/lib/settings/TextSizeBoot';
import type { ShellData } from '@/components/shell/ShellContext';
import { Providers } from './Providers';
import './globals.css';

// The data source is chosen per request (BELAY_MODE), so no page may be prerendered at build time.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Afterlife',
  description: 'Proof-carrying agents for the post-code lifecycle on GitLab.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const ds = getDataSource();
  const data: ShellData = {
    mode: ds.mode,
    fakeGitlab: ds.mode === 'live' && readDataConfig(process.env).gitlab === 'fake',
    group: ds.getPortfolio().group,
    illustrative: ds.illustrative.length > 0,
  };
  return (
    // data-text-size is rewritten by the boot script before first paint, hence suppressHydrationWarning.
    <html lang="en" data-text-size={DEFAULT_TEXT_SIZE} suppressHydrationWarning>
      <head>
        <TextSizeBoot />
      </head>
      <body>
        <Providers needsYouCount={ds.getNeedsYouCount()} data={data}>{children}</Providers>
      </body>
    </html>
  );
}
