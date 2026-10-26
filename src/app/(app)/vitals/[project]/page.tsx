import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';

type Params = { params: Promise<{ project: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { project } = await params;
  return { title: `Belay Vitals ${project}` };
}

/** Says the title is read at request time on purpose (it names the slug); renders nothing. */
async function RequestTime() {
  await connection();
  return null;
}

// The route exists for a hard load (and its title); it reads nothing. The screen host draws the project's vitals
// (features/vitals/screen/host.tsx) and streams them over GET /api/screen/vitals%2F%5Bproject%5D, band by band; a slug
// no saved project has answers notFound there and the host draws the project's not-found window. The title names the
// slug, so it is request data: the empty marker below tells Cache Components that is intended.
export default function VitalsProjectPage() {
  return (
    <Suspense>
      <RequestTime />
    </Suspense>
  );
}
