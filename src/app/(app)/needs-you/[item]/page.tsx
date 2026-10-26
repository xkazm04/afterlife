import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';

type Params = { params: Promise<{ item: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { item } = await params;
  return { title: `Belay Needs you ${item}` };
}

// The route exists for a hard load (and its title); it reads nothing. The screen host draws the decision's page
// (features/needs-you/screen/host.tsx) and its data streams in over GET /api/screen/needs-you%2F%5Bitem%5D; live mode,
// the empty state or an unknown id is the stream's notFound, drawn as DecisionNotFound.
// The title names the id, so it is request data: the empty marker below tells Cache Components that is intended
// (next/dist/docs: generate-metadata, "runtime data"), and the rest stays in the static shell.
export default function NeedsItemRoute() {
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
