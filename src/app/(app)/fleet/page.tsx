import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Afterlife · Fleet' };

// The route exists for a hard load (and its title); it reads nothing. The screen host in the (app) layout draws Fleet
// (features/fleet/screen/host.tsx): its window is in the static shell, the list state comes from the URL on the client,
// and the fleet streams in over GET /api/screen/fleet on every load, the first one included (`?project=<id>` of a
// project the fleet has is a redirect there, to /fleet/<id>).
export default function FleetPage() {
  return null;
}
