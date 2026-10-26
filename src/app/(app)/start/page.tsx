import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Afterlife · Projects' };

// Projects: the projects saved on this machine and the orbit of one (?project=<slug>), or of a new one being added.
// The route exists for a hard load (and its title); it reads nothing. The screen host draws it
// (features/start/screen/host.tsx): its window is in the static shell, the facts, the saved projects and "Your repos"
// (this machine only) stream in over GET /api/screen/start, and the probes stream from the client (/api/start/probe).
// `?rehearse=not-ready` shows the live not-ready state on purpose (labelled a rehearsal). /trace and /onboard land here
// (next.config.ts). While live mode has nothing to show, the (app) layout's gate covers the column with this wizard.
export default function StartPage() {
  return null;
}
