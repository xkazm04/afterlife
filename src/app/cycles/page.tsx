import type { Metadata } from 'next';
import { loadCyclesData } from '../features/cycles/data/loadCyclesData';
import { CyclesScreen } from '../features/cycles/CyclesScreen';

export const metadata: Metadata = { title: 'Cycles' };

type Search = { searchParams: Promise<{ [key: string]: string | string[] | undefined }> };
const one = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);

// Cycles: the Maturity scan and gaps, joined to the closed-cycle history on the server. ?design=1 opens the designer.
export default async function CyclesPage({ searchParams }: Search) {
  const design = one((await searchParams).design) === '1';
  return <CyclesScreen key={String(design)} data={loadCyclesData()} startDesign={design} />;
}
