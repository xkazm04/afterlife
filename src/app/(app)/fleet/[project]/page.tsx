import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';

type Params = { params: Promise<{ project: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { project } = await params;
  return { title: `Belay Fleet ${project}` };
}

/** Says the title is read at request time on purpose (it names the id); renders nothing. */
async function RequestTime() {
  await connection();
  return null;
}

// The route exists for a hard load (and its title); it reads nothing. The screen host draws the project's page
// (features/fleet/screen/host.tsx) and streams it over GET /api/screen/fleet%2F%5Bproject%5D; an id the fleet does not
// have answers notFound there and the host draws the project's not-found window. The title names the id, so it is
// request data: the empty marker below tells Cache Components that is intended, and the rest stays in the static shell.
export default function FleetProjectPage() {
  return (
    <Suspense>
      <RequestTime />
    </Suspense>
  );
}
