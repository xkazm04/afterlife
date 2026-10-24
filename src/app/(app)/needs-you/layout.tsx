import type { ReactNode } from 'react';
import { loadNeedsYouView } from '@/app/features/needs-you/data/pick';
import { NeedsStore } from '@/app/features/needs-you/hooks/NeedsStore';
import { connection } from 'next/server';

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

/** The desk's state lives here, above the list and the decision pages, so staging on a page reaches the list's outbox. */
export default async function NeedsYouLayout({ children }: { children: ReactNode }) {
  await connection(); // request time: the data source and its data are the running server's, never the build's
  const view = loadNeedsYouView();
  return view.kind === 'desk' ? <NeedsStore demo={view.demo}>{children}</NeedsStore> : children;
}
