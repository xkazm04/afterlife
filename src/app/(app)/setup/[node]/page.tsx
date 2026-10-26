import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadSetupNode } from '@/app/features/setup/data/loadSetupNode';
import { SetupNodeScreen } from '@/app/features/setup/SetupNodeScreen';
import { connection } from 'next/server';

type Params = { params: Promise<{ node: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { node } = await params;
  return { title: `Afterlife · Setup · ${node}` };
}

export default async function SetupNodePage({ params }: Params) {
  await connection(); // request time: the data source and its data are the running server's, never the build's
  const { node } = await params;
  const focus = loadSetupNode(node);
  if (!focus) notFound();
  return <SetupNodeScreen focus={focus} />;
}
