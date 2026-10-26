'use client';

// The Ladder's screens for the screen host (docs/features/screen-host.md). The list and every class page share ONE
// ladder store (LadderSession), fed by whichever screen's slices land: a revoke sent on a class page (the demo's simulated
// one too) is the same move on the list. The window, toolbar (tier filter, lozenge, sort, search), the table's header and
// the dock paint in the click's frame.
// Reveal order, /ladder:
//   0  window chrome, toolbar, table header, dock                at once
//   1  sidebar (tracks and smart filters, with their counts)     core
//   2  the class rows (they need the moves: the opening order)   ledger
// Reveal order, /ladder/[class]:
//   0  window chrome, back link, title (the URL's class)         at once
//   1  the class's cards (who acted and all moves fill on ledger, the human key line on humanKey)   core
import { useLayoutEffect } from 'react';
import { useSlice, type ScreenDef, type ScreenFrameProps } from '@/components/shell/host';
import { TIER_DISPLAY_ORDER } from '@/lib/tiers';
import type { HumanKeyRead } from '@/lib/promotion';
import { ClassScreen } from '../ClassScreen';
import { ClassNotFound } from '../components/inspector/ClassPending';
import { LadderScreen, type LadderScreenProps } from '../LadderScreen';
import type { LedgerPart } from '../model/session/store';
import { LadderSession, useLadderSession, type LadderCore } from './session';

/** The screens' props before the core read: nothing known (the screens draw dashes for every value). */
const UNREAD_PROPS: Omit<LadderScreenProps, 'seed'> = {
  project: '',
  tracks: [],
  means: Object.fromEntries(TIER_DISPLAY_ORDER.map((t) => [t, '—'])) as LadderScreenProps['means'],
  policy: null,
  tiersStale: null,
  illustrative: { history: false, tracks: false },
  live: false,
  feedAgeSec: null,
  subtitle: '—',
};

/** Hands the screen's slices to the session before paint, and gives the screen what the session holds. */
function useLadder() {
  const core = useSlice<LadderCore>('core');
  const ledger = useSlice<LedgerPart>('ledger');
  const session = useLadderSession();
  const arriveCore = session?.arriveCore;
  const arriveLedger = session?.arriveLedger;
  useLayoutEffect(() => {
    if (core.state === 'ok') arriveCore?.(core.data);
  }, [core, arriveCore]);
  useLayoutEffect(() => {
    if (ledger.state === 'ok') arriveLedger?.(ledger.data);
  }, [ledger, arriveLedger]);
  const read = session?.core ?? null;
  const ledgerRead = !!session?.store.ledger;
  return {
    props: { ...(read ?? UNREAD_PROPS), seed: session?.seed ?? { classes: [], ledger: [], quotes: {}, head: { sha: '', by: '' }, tz: 'UTC' } },
    // a failed ledger read stops holding the rows back (they keep the classes' order); the class page still dashes it
    unread: { core: !read, ledger: !ledgerRead && ledger.state !== 'error' },
    ledgerRead,
    coreError: core.state === 'error' ? core.reason : undefined,
  };
}

function LadderFrame() {
  const { props, unread, coreError } = useLadder();
  return <LadderScreen {...props} unread={unread} coreError={coreError} />;
}

function ClassFrame({ params }: ScreenFrameProps) {
  const { props, unread, ledgerRead, coreError } = useLadder();
  const humanKey = useSlice<HumanKeyRead>('humanKey');
  return (
    <ClassScreen
      {...props}
      id={params.class ?? ''}
      humanKey={humanKey.state === 'ok' ? humanKey.data : undefined}
      unread={{ core: unread.core, ledger: !ledgerRead }}
      coreError={coreError}
    />
  );
}

export const screens: readonly ScreenDef[] = [
  { key: 'ladder', ready: true, slices: ['core', 'ledger'], Frame: LadderFrame, Session: LadderSession, title: () => 'Afterlife · Ladder' },
  {
    key: 'ladder/[class]',
    ready: true,
    slices: ['core', 'ledger', 'humanKey'],
    Frame: ClassFrame,
    Session: LadderSession,
    NotFound: ClassNotFound,
    title: (p) => `Afterlife · Ladder · ${p.class}`,
  },
];
