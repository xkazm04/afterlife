import type { Metadata } from 'next';
import { firstParam } from '@/lib/url/searchParams';
import { loadCyclesData } from '../features/cycles/data/loadCyclesData';
import { loadEstateData } from '../features/cycles/data/loadEstateData';
import { CyclesScreen } from '../features/cycles/CyclesScreen';
import { EstateScreen } from '../features/cycles/components/estate/EstateScreen';

export const metadata: Metadata = { title: 'Belay Cycles' };

type Search = { searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

// Cycles: the Maturity scan and gaps, joined to the closed-cycle history on the server. ?design=1 opens the designer;
// ?scope=estate shows every project in cycles, per group.
export default async function CyclesPage({ searchParams }: Search) {
  const q = await searchParams;
  if (firstParam(q.scope) === 'estate') return <EstateScreen data={loadEstateData()} />;
  const design = firstParam(q.design) === '1';
  return <CyclesScreen key={String(design)} data={loadCyclesData()} startDesign={design} />;
}
