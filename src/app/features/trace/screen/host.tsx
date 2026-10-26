'use client';

// Trace on the screen host (docs/features/screen-host.md). One slice, `facts` (the server's environment and the live
// gate: tiny, in memory). The wire paints in the click's frame with every node unprobed, and its probe (GET /api/trace,
// client-side as before) starts at once; the subtitle, the source chip, the gate copy and the command fill from facts.
// Reveal order:
//   0  window chrome, toolbar (Re-check all), status line     at once
//   1  the header (intro, or the live gate's copy)           facts
//   2  the wire, six nodes unprobed                          on mount
//   3  the selected node's detail and its command            facts
import { requestShellRead } from '@/components/shell/live/sync';
import { useRevalidate, useSlice, type ScreenDef, type ScreenFrameProps } from '@/components/shell/host';
import type { TraceFacts } from '../model/types';
import { TraceScreen } from '../TraceScreen';

/** `?rehearse=not-ready`: the live not-ready state shown on purpose (labelled a rehearsal). */
const rehearseOf = (search: URLSearchParams): boolean => search.get('rehearse') === 'not-ready';

function TraceFrame({ search }: ScreenFrameProps) {
  const facts = useSlice<TraceFacts>('facts');
  const revalidate = useRevalidate();
  // The live node passed while Trace stood in for the app: the facts and the shell (the gate follows it) read again.
  const onLive = () => {
    requestShellRead();
    revalidate();
  };
  return <TraceScreen facts={facts.state === 'ok' ? facts.data : undefined} rehearse={rehearseOf(search)} onLive={onLive} />;
}

export const screens: readonly ScreenDef[] = [{ key: 'trace', ready: true, slices: ['facts'], Frame: TraceFrame, title: () => 'Belay Trace' }];
