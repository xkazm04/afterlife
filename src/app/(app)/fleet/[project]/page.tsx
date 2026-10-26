import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProjectDetail } from '@/app/features/fleet/components/detail/ProjectDetail';
import { loadFleetEstate } from '@/app/features/fleet/data/loadFleetEstate';
import { loadFleetProject } from '@/app/features/fleet/data/loadFleetProject';
import { readDesk } from '@/server/runs/readDesk';
import { connection } from 'next/server';

type Params = { params: Promise<{ project: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { project } = await params;
  return { title: `Afterlife · Fleet · ${project}` };
}

export default async function FleetProjectPage({ params }: Params) {
  await connection(); // request time: the data source and its data are the running server's, never the build's
  const { project } = await params;
  const view = loadFleetProject(project);
  if (!view) notFound();
  // the agent cost is read beside the project (the runner's local files), never in FleetProject
  return <ProjectDetail {...view} estate={loadFleetEstate(view.data, await readDesk())} />;
}
