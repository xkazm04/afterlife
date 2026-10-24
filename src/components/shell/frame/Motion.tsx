'use client';

import * as React from 'react';
import type { ReactNode } from 'react';

// The App Router runs React canary, which has <ViewTransition>; a plain React (vitest) does not, and there the children
// render as they are. Import path per node_modules/next/dist/docs/01-app/02-guides/view-transitions.md.
// `in` first: a vitest vi.mock('react') proxy throws on reading an export it does not define.
const VT = 'ViewTransition' in React ? (React as Partial<Pick<typeof React, 'ViewTransition'>>).ViewTransition : undefined;

/**
 * A view-transition boundary that animates only when its subtree enters or exits on a navigation (`default="none"`: an
 * update in place never animates). The classes are in src/styles/transitions.css, which also turns them off under
 * prefers-reduced-motion. Content: `app-enter` / `app-exit`; the door hand-off: `door-exit` and `frame-enter`.
 */
export function Motion({ enter, exit, children }: { enter?: string; exit?: string; children: ReactNode }) {
  if (!VT) return <>{children}</>;
  return (
    <VT enter={enter ?? 'none'} exit={exit ?? 'none'} default="none">
      {children}
    </VT>
  );
}
