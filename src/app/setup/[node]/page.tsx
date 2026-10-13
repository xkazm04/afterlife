import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadSetupNode } from '../../features/setup/data/loadSetupNode';
import { SetupNodeScreen } from '../../features/setup/SetupNodeScreen';

type Params = { params: Promise<{ node: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { node } = await params;
  return { title: `Belay Setup ${node}` };
}

export default async function SetupNodePage({ params }: Params) {
  const { node } = await params;
  const focus = loadSetupNode(node);
  if (!focus) notFound();
  return <SetupNodeScreen focus={focus} />;
}
