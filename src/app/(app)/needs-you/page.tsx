import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Afterlife · Needs you' };

// The route exists for a hard load (and its title); it reads nothing. The screen host in the (app) layout draws Needs you
// (features/needs-you/screen/host.tsx): the demo's desk, the group's live desk or the empty state, its window in the
// static shell, and its data streamed in over GET /api/screen/needs-you on every load (and every visit).
export default function NeedsYouPage() {
  return null;
}
