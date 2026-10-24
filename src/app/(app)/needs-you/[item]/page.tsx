import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NeedsItemPage } from '@/app/features/needs-you/components/detail/NeedsItemPage';
import { loadNeedsItem } from '@/app/features/needs-you/data/pick';
import { connection } from 'next/server';

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

type Params = { params: Promise<{ item: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { item } = await params;
  return { title: `Belay Needs you ${item}` };
}

export default async function NeedsItemRoute({ params }: Params) {
  await connection(); // request time: the data source and its data are the running server's, never the build's
  const { item } = await params;
  const view = loadNeedsItem(item);
  if (!view) notFound();
  return <NeedsItemPage demo={view.demo} id={view.id} />;
}
