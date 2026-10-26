import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ClassScreen } from '@/app/features/ladder/ClassScreen';
import { loadHumanKey, loadLadderClass } from '@/app/features/ladder/data/loadLadderClass';
import { connection } from 'next/server';

type Params = { params: Promise<{ class: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { class: id } = await params;
  return { title: `Afterlife · Ladder · ${id}` };
}

export default async function LadderClassPage({ params }: Params) {
  await connection(); // request time: the data source and its data are the running server's, never the build's
  const { class: id } = await params;
  const data = loadLadderClass(id);
  if (!data) notFound();
  return <ClassScreen {...data} humanKey={await loadHumanKey()} />;
}
