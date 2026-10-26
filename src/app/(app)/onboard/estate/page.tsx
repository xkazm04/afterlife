import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Belay Onboard' };

// Onboard's estate funnel. The route exists for a hard load (and its title); it reads nothing. The screen host draws it
// (features/onboard/screen/host.tsx; ?preview=1 opens with the next batch's commands shown): its window is in the static
// shell, and the estate streams in over GET /api/screen/onboard%2Festate.
export default function OnboardEstatePage() {
  return null;
}
