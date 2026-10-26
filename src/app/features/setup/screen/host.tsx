'use client';

// Setup for the screen host (docs/features/screen-host.md). Both screens share one Session (SetupSession: the flow, the
// arm and enroll writes, the map's hover and filter), so a probe or an arm on a node's page is still there on the map.
// The Session sits outside the screens' scope: each Frame feeds it its slices (hooks/session/feed.tsx).
// Reveal order, the map (/setup):
//   0  window chrome, toolbar (group, doctor lozenge, Re-probe), status         at once (dashes until the catalogue)
//   1  the summary strip (counts, the gates only you can open)                  catalogue
//   2  the unlock map (steps, tracks, capabilities, the edges)                  catalogue
//   -  live: each node's state, each count, the doctor lozenge fill in place   tracks, doctor, steps (as each resolves)
// A node page (/setup/<node>): its heading and lede at once (a dash), then its cards (order 1, catalogue); live values
// fill in place the same way. An unknown node is the not-found card (the server's notFound, or the client's own check).
import type { ScreenDef } from '@/components/shell/host';
import { SetupNodeNotFound } from '../components/SetupNodeNotFound';
import { SETUP_SLICES } from '../hooks/session/feed';
import { SetupSession } from '../hooks/SetupProvider';
import { SetupNodeScreen } from '../SetupNodeScreen';
import { SetupScreen } from '../SetupScreen';

function SetupFrame() {
  return <SetupScreen />;
}

function SetupNodeFrame({ params }: { params: Readonly<Record<string, string>> }) {
  return <SetupNodeScreen node={params.node ?? ''} />;
}

export const screens: readonly ScreenDef[] = [
  { key: 'setup', ready: true, slices: SETUP_SLICES, Frame: SetupFrame, Session: SetupSession, title: () => 'Belay Setup' },
  {
    key: 'setup/[node]',
    ready: true,
    slices: SETUP_SLICES,
    Frame: SetupNodeFrame,
    Session: SetupSession,
    title: (p) => `Belay Setup ${p.node ?? ''}`,
    NotFound: SetupNodeNotFound,
  },
];
