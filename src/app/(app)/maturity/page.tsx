import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Afterlife · Maturity' };

// The route exists for a hard load (and its title); it reads nothing. The screen host in the (app) layout draws the crag
// (features/maturity/screen/host.tsx): its window is in the static shell, and its data streams in over
// GET /api/screen/maturity on every load, the first one included.
export default function MaturityPage() {
  return null;
}
