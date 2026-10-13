import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProjectDetail } from '../../features/fleet/components/detail/ProjectDetail';
import { loadFleetProject } from '../../features/fleet/data/loadFleetProject';

type Params = { params: Promise<{ project: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { project } = await params;
  return { title: `Belay Fleet ${project}` };
}

export default async function FleetProjectPage({ params }: Params) {
  const { project } = await params;
  const view = loadFleetProject(project);
  if (!view) notFound();
  return <ProjectDetail {...view} />;
}
