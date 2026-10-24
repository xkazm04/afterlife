import type { Metadata } from 'next';
import { firstParam } from '@/lib/url/searchParams';
import { loadCyclesData } from '@/app/features/cycles/data/loadCyclesData';
import { loadEstateData } from '@/app/features/cycles/data/loadEstateData';
import { CyclesScreen } from '@/app/features/cycles/CyclesScreen';
import { EstateScreen } from '@/app/features/cycles/components/estate/EstateScreen';
import { connection } from 'next/server';

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = { title: 'Belay Cycles' };

type Search = { searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

// Cycles: the Maturity scan and gaps, joined to the closed-cycle history on the server. ?design=1 opens the designer;
// ?scope=estate shows every project in cycles, per group.
export default async function CyclesPage({ searchParams }: Search) {
  await connection(); // request time: the data source and its data are the running server's, never the build's
  const q = await searchParams;
  if (firstParam(q.scope) === 'estate') return <EstateScreen data={loadEstateData()} />;
  const design = firstParam(q.design) === '1';
  return <CyclesScreen key={String(design)} data={loadCyclesData()} startDesign={design} />;
}
