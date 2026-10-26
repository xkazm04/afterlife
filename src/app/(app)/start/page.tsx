import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Afterlife · Set up' };

// Set up my first project. The route exists for a hard load (and its title); it reads nothing. The screen host draws
// the wizard (features/start/screen/host.tsx): its window is in the static shell, the facts and "Your repos" (this
// machine only) stream in over GET /api/screen/start, and the probes stream from the client (/api/start/probe).
// `?rehearse=not-ready` shows the live not-ready state on purpose (labelled a rehearsal). /trace and /onboard land here
// (next.config.ts). While live mode has nothing to show, the (app) layout's gate covers the column with this wizard.
export default function StartPage() {
  return null;
}
