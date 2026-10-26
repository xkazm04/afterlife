'use client';

// /start on the screen host (docs/features/screen-host.md). Two slices: `facts` (the server's environment and live
// runtime, sync) and `repos` ("Your repos", git, slower, loopback only). The window and its title paint in the click's
// frame; the wizard (StartScreen) mounts when the facts land, and its probes stream from the client as they always did
// (GET /api/start/probe, useProbe), never through the host. "Your repos" is a dash in the picker until `repos` lands.
// Reveal order:
//   0  window chrome, title, Re-check                                   at once (StartPending until the facts land)
//   1  the source chips and the constellation of steps                  facts
// When live mode has nothing to show, the (app) layout's gate (gate/LiveGate.tsx, a server read) covers the column with
// this same wizard, so the host's copy draws nothing (as the page did): one wizard, one probe.
// Kept state: the host keeps /start mounted when the person leaves it; a stack run (a proposal takes about a minute) is
// never aborted by leaving (useStack), while the probe re-runs on each showing (useProbe's effect).
import { useSlice, type ScreenDef, type ScreenFrameProps } from '@/components/shell/host';
import { reposOf, type ReposRead } from '../model/stack/repos';
import type { StartFacts } from '../model/types';
import { StartScreen } from '../StartScreen';
import { StartPending } from './StartPending';

function StartFrame({ search }: ScreenFrameProps) {
  const facts = useSlice<StartFacts>('facts');
  const repos = reposOf(useSlice<ReposRead>('repos'));
  if (facts.state === 'error') return <StartPending error={facts.reason} />;
  if (facts.state === 'unread') return <StartPending />;
  if (facts.data.gate && !facts.data.rehearsal) return null; // the layout's gate covers the column with this same wizard
  // a rehearsal is another probe address: its own instance
  return <StartScreen key={search.get('rehearse') ?? ''} facts={facts.data} {...repos} />;
}

export const screens: readonly ScreenDef[] = [
  { key: 'start', ready: true, slices: ['facts', 'repos'], Frame: StartFrame, title: () => 'Afterlife · Set up' },
];
