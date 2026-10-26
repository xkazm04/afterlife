import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadVitalsProject } from '@/app/features/vitals/data/loadVitals';
import { VitalsScreen } from '@/app/features/vitals/VitalsScreen';
import { connection } from 'next/server';

type Params = { params: Promise<{ project: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { project } = await params;
  return { title: `Afterlife · Vitals · ${project}` };
}

// One real project's vitals: its config and stored measurements, folded on the server, so the client gets rows and not
// the run history. A slug no saved project has is notFound (rendered behind this route's loading boundary, as
// /fleet/[project] is: the not-found view streams in).
export default async function VitalsProjectPage({ params }: Params) {
  await connection(); // request time: a collect appends to the files while the page is open
  const { project } = await params;
  const view = loadVitalsProject(project);
  if (!view) notFound();
  return <VitalsScreen view={view} />;
}
