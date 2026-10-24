import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProjectDetail } from '../../features/fleet/components/detail/ProjectDetail';
import { loadFleetEstate } from '../../features/fleet/data/loadFleetEstate';
import { loadFleetProject } from '../../features/fleet/data/loadFleetProject';
import { readDesk } from '@/server/runs/readDesk';
import { connection } from 'next/server';

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

type Params = { params: Promise<{ project: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { project } = await params;
  return { title: `Belay Fleet ${project}` };
}

export default async function FleetProjectPage({ params }: Params) {
  await connection(); // request time: the data source and its data are the running server's, never the build's
  const { project } = await params;
  const view = loadFleetProject(project);
  if (!view) notFound();
  // the agent cost is read beside the project (the runner's local files), never in FleetProject
  return <ProjectDetail {...view} estate={loadFleetEstate(view.data, readDesk())} />;
}
