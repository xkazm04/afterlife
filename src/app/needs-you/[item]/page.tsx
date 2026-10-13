import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NeedsItemPage } from '../../features/needs-you/components/detail/NeedsItemPage';
import { loadNeedsItem } from '../../features/needs-you/data/pick';

type Params = { params: Promise<{ item: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { item } = await params;
  return { title: `Belay Needs you ${item}` };
}

export default async function NeedsItemRoute({ params }: Params) {
  const { item } = await params;
  const view = loadNeedsItem(item);
  if (!view) notFound();
  return <NeedsItemPage demo={view.demo} id={view.id} />;
}
