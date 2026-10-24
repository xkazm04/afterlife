import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadMaturityStage } from '../../features/maturity/data/loadMaturityStage';
import { StageScreen } from '../../features/maturity/StageScreen';
import { connection } from 'next/server';

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

type Params = { params: Promise<{ stage: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { stage } = await params;
  return { title: `Belay Maturity ${stage}` };
}

export default async function MaturityStagePage({ params }: Params) {
  await connection(); // request time: the data source and its data are the running server's, never the build's
  const { stage: key } = await params;
  const stage = loadMaturityStage(key);
  if (!stage) notFound();
  return <StageScreen stage={stage} />;
}
