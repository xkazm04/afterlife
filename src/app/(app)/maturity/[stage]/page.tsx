import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';

type Params = { params: Promise<{ stage: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { stage } = await params;
  return { title: `Belay Maturity ${stage}` };
}

// The route exists for a hard load (and its title); it reads nothing. The screen host draws the stage page
// (features/maturity/screen/host.tsx) and its data streams in over GET /api/screen/maturity%2F%5Bstage%5D; an unknown
// stage is the stream's notFound (and the client's own check: the nine stages are static), drawn as StageNotFound.
// The title names the id, so it is request data: the empty marker below tells Cache Components that is intended
// (next/dist/docs: generate-metadata, "runtime data"), and the rest stays in the static shell.
export default function MaturityStagePage() {
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
