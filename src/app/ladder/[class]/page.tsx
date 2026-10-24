import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ClassScreen } from '../../features/ladder/ClassScreen';
import { loadHumanKey, loadLadderClass } from '../../features/ladder/data/loadLadderClass';
import { connection } from 'next/server';

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

type Params = { params: Promise<{ class: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { class: id } = await params;
  return { title: `Belay Ladder ${id}` };
}

export default async function LadderClassPage({ params }: Params) {
  await connection(); // request time: the data source and its data are the running server's, never the build's
  const { class: id } = await params;
  const data = loadLadderClass(id);
  if (!data) notFound();
  return <ClassScreen {...data} humanKey={await loadHumanKey()} />;
}
