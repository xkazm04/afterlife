import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ClassScreen } from '../../features/ladder/ClassScreen';
import { loadLadderClass } from '../../features/ladder/data/loadLadderClass';

type Params = { params: Promise<{ class: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { class: id } = await params;
  return { title: `Belay Ladder ${id}` };
}

export default async function LadderClassPage({ params }: Params) {
  const { class: id } = await params;
  const data = loadLadderClass(id);
  if (!data) notFound();
  return <ClassScreen {...data} />;
}
