import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ScreenSkeleton } from '@/components/shell/loading/ScreenSkeleton';
import { loadLadderData } from '@/app/features/ladder/data/loadLadderData';
import { LadderScreen } from '@/app/features/ladder/LadderScreen';
import { connection } from 'next/server';

export const metadata: Metadata = { title: 'Afterlife · Ladder' };

// The table skeleton is the page's own boundary, not a ladder/loading.tsx: that one would also wrap /ladder/<class> and
// paint the list's rows before the class page's sections on a direct load.
export default function LadderPage() {
  return (
    <Suspense fallback={<ScreenSkeleton title="Ladder" layout="table" />}>
      <Ladder />
    </Suspense>
  );
}

async function Ladder() {
  await connection(); // request time: the data source and its data are the running server's, never the build's
  return <LadderScreen {...loadLadderData()} />;
}
