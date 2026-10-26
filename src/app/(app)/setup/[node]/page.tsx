import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';

type Params = { params: Promise<{ node: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { node } = await params;
  return { title: `Belay Setup ${node}` };
}

/** Marks the route as meant to be dynamic (its title reads the param), so the title does not block the static shell. */
async function Request() {
  await connection();
  return null;
}

// The route exists for a hard load (and its title); it reads nothing. The screen host draws the node's page
// (features/setup/screen/host.tsx) and its data streams in over GET /api/screen/setup%2F%5Bnode%5D; an unknown node is
// the stream's notFound (and the client's own check against the catalogue), drawn as SetupNodeNotFound. The marker
// below is the Cache Components way to say the title is request data (next/dist/docs: generate-metadata, "runtime data").
export default function SetupNodePage() {
  return (
    <Suspense>
      <Request />
    </Suspense>
  );
}
