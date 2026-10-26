import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';

type Params = { params: Promise<{ class: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { class: id } = await params;
  return { title: `Belay Ladder ${id}` };
}

// The route exists for a hard load (and its title); it reads nothing. The screen host draws the class page
// (features/ladder/screen/host.tsx) and its data streams in over GET /api/screen/ladder%2F%5Bclass%5D; a class the data
// source does not hold is the stream's notFound, drawn as ClassNotFound.
// The title names the id, so it is request data: the empty marker below tells Cache Components that is intended
// (next/dist/docs: generate-metadata, "runtime data"), and the rest stays in the static shell.
export default function LadderClassPage() {
  return (
    <Suspense>
      <RequestTime />
    </Suspense>
  );
}

/** Says the title is read at request time on purpose; renders nothing. */
async function RequestTime() {
  await connection();
  return null;
}
