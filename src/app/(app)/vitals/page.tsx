import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Belay Vitals' };

// The route exists for a hard load (and its title); it reads nothing. The screen host draws Vitals
// (features/vitals/screen/host.tsx): its window is in the static shell, and the saved projects stream in over
// GET /api/screen/vitals on every load (a request addressed to this machine only: they are this machine's files).
export default function VitalsPage() {
  return null;
}
