import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { liveGate, loadTraceFacts } from '@/app/features/trace/data/facts';
import { TraceScreen } from '@/app/features/trace/TraceScreen';
import { ScreenSkeleton } from '@/components/shell/loading/ScreenSkeleton';
import { firstParam } from '@/lib/url/searchParams';

export const metadata: Metadata = { title: 'Belay Trace' };

type Params = Promise<{ [key: string]: string | string[] | undefined }>;

// Trace: set up your first project as one wire of probes. `?rehearse=not-ready` shows the live not-ready state on purpose
// (labelled a rehearsal), for a server whose first poll has already finished.
export default function TracePage({ searchParams }: { searchParams: Params }) {
  return (
    <Suspense fallback={<ScreenSkeleton title="Trace" layout="sections" />}>
      <TraceRead searchParams={searchParams} />
    </Suspense>
  );
}

async function TraceRead({ searchParams }: { searchParams: Params }) {
  await connection(); // request time: the environment is the running server's
  const rehearse = firstParam((await searchParams).rehearse) === 'not-ready';
  if (liveGate().gate) return null; // the layout's gate already covers the column with this same screen
  return <TraceScreen facts={loadTraceFacts(rehearse)} />;
}
