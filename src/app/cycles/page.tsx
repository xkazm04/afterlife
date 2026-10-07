import type { Metadata } from 'next';
import { loadCyclesData } from '../features/cycles/data/loadCyclesData';
import { CyclesScreen } from '../features/cycles/CyclesScreen';

export const metadata: Metadata = { title: 'Cycles' };

// Cycles: the Maturity scan and gaps, joined to the closed-cycle history on the server.
export default function CyclesPage() {
  return <CyclesScreen data={loadCyclesData()} />;
}
