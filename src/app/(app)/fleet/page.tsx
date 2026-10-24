import type { Metadata } from 'next';
import { Suspense } from 'react';
import type { RawParams } from '@/app/features/fleet/model/list/urlState';
import { ScreenSkeleton } from '@/components/shell/loading/ScreenSkeleton';
import { FleetList } from './FleetList';

export const metadata: Metadata = { title: 'Belay Fleet' };

// Fleet: the window and its table skeleton paint at once; the fleet itself (FleetList) streams in behind connection().
// The skeleton is this page's own boundary, not a fleet/loading.tsx: a segment loading would also wrap /fleet/<id>, and a
// direct visit to a project would show the fleet's table before the project's own detail skeleton.
export default function FleetPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  return (
    <Suspense fallback={<ScreenSkeleton title="Belay" layout="table" />}>
      <FleetList searchParams={searchParams} />
    </Suspense>
  );
}
