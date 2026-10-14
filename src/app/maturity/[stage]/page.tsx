import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadMaturityStage } from '../../features/maturity/data/loadMaturityStage';
import { StageScreen } from '../../features/maturity/StageScreen';

type Params = { params: Promise<{ stage: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { stage } = await params;
  return { title: `Belay Maturity ${stage}` };
}

export default async function MaturityStagePage({ params }: Params) {
  const { stage: key } = await params;
  const stage = loadMaturityStage(key);
  if (!stage) notFound();
  return <StageScreen stage={stage} />;
}
