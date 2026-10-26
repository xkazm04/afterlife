import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Afterlife · Cycles' };

// The route exists for a hard load (and its title); it reads nothing. The screen host in the (app) layout draws Cycles
// (features/cycles/screen/host.tsx): ?scope=estate the estate, ?design=1 the designer. Its window is in the static shell,
// and its data streams in over GET /api/screen/cycles on every load, the first one included.
export default function CyclesPage() {
  return null;
}
