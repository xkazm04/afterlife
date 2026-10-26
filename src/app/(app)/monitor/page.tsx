import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Belay Monitor' };

// The route exists for a hard load (and its title); it reads nothing. The screen host in the (app) layout draws the
// Monitor (features/monitor/screen/host.tsx): its window is in the static shell, and its data streams in over
// GET /api/screen/monitor on every load, the first one included.
export default function MonitorPage() {
  return null;
}
