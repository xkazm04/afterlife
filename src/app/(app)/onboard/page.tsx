import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Belay Onboard' };

// Onboard: a real project in one click. The route exists for a hard load (and its title); it reads nothing. The screen
// host in the (app) layout draws the wizard (features/onboard/screen/host.tsx): its window is in the static shell, and
// "Your repos" streams in over GET /api/screen/onboard, which answers only a request addressed to this machine (the list
// names local paths). The proposal, the probes and the save run from the client through /api/onboard/*. The demo estate
// is /onboard/estate.
export default function OnboardPage() {
  return null;
}
