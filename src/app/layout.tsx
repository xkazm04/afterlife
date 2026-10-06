import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { getNeedsYouCount } from '@/lib/demo';
import { DEFAULT_TEXT_SIZE } from '@/lib/settings/textSize';
import { TextSizeBoot } from '@/lib/settings/TextSizeBoot';
import { Providers } from './Providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Belay',
  description: 'Proof-carrying agents for the post-code lifecycle on GitLab.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // data-text-size is rewritten by the boot script before first paint, hence suppressHydrationWarning.
    <html lang="en" data-text-size={DEFAULT_TEXT_SIZE} suppressHydrationWarning>
      <head>
        <TextSizeBoot />
      </head>
      <body>
        <Providers needsYouCount={getNeedsYouCount()}>{children}</Providers>
      </body>
    </html>
  );
}
