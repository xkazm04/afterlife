import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Belay Setup' };

// The route exists for a hard load (and its title); it reads nothing. The screen host in the (app) layout draws the
// unlock map (features/setup/screen/host.tsx): its window is in the static shell, and the catalogue and the live reads
// stream in over GET /api/screen/setup on every load, the first one included.
export default function SetupPage() {
  return null;
}
