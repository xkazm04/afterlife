import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Belay Ladder' };

// The route exists for a hard load (and its title); it reads nothing. The screen host in the (app) layout draws the
// Ladder (features/ladder/screen/host.tsx): its window is in the static shell, and its data streams in over
// GET /api/screen/ladder on every load, the first one included.
export default function LadderPage() {
  return null;
}
