import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { liveGate, loadTraceFacts } from '@/app/features/start/gate/facts';
import { loadRepos } from '@/app/features/start/gate/repos';
import { StartScreen } from '@/app/features/start/StartScreen';
import { parseVariant } from '@/app/features/start/variants/keys';
import { ScreenSkeleton } from '@/components/shell/loading/ScreenSkeleton';
import { firstParam } from '@/lib/url/searchParams';

export const metadata: Metadata = { title: 'Afterlife · Set up' };

type Params = Promise<{ [key: string]: string | string[] | undefined }>;

// Set up my first project: the facts the server knows without probing, and "Your repos" (this machine only), read at
// request time; the probes stream from the client (/api/start/probe). `?v=` picks the presentation (a prototype choice);
// `?rehearse=not-ready` shows the live not-ready state on purpose (labelled a rehearsal). /trace and /onboard land here.
export default function StartPage({ searchParams }: { searchParams: Params }) {
  return (
    <Suspense fallback={<ScreenSkeleton title="Set up my first project" layout="sections" />}>
      <StartRead searchParams={searchParams} />
    </Suspense>
  );
}

async function StartRead({ searchParams }: { searchParams: Params }) {
  await connection(); // request time: the environment and the repos are the running server's, never the build's
  const q = await searchParams;
  if (liveGate().gate) return null; // the layout's gate already covers the column with this same screen
  const repos = await loadRepos(await headers());
  return <StartScreen facts={loadTraceFacts(firstParam(q.rehearse) === 'not-ready')} {...repos} variant={parseVariant(firstParam(q.v))} />;
}
