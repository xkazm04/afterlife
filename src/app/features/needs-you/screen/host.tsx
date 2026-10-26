'use client';

// Needs you on the screen host (docs/features/screen-host.md). The list and a decision's page share ONE desk store
// (NeedsSession: the store and the CRA clock's one tick), fed by whichever screen's view slice lands: a write staged on
// a page is in the list's outbox and back. The mode is known before the view lands (the shell's read): the right window
// (the demo's desk or the group's live desk) paints in the click's frame. Needs you re-reads on EVERY visit; until the
// fresh read lands, each region carries its own "as of HH:MM:SS" note and cannot be acted on (StaleRegion): amber is
// never shown as fresh when it is not.
// Reveal order, /needs-you:
//   0  window chrome, toolbar (group by, outbox, search), outbox            at once
//   1  sidebar filters with their counts (desk) / the runner's line (live)  view / desk
//   2  the runner's line, the CRA band (desk) / the summary band (live)     desk, view
//   3  the decisions table                                                  view
// Reveal order, /needs-you/[item]:
//   0  window chrome, back link, title (the URL's id until read)            at once
//   1  the decision's cards                                                 view
import { useLayoutEffect } from 'react';
import { PaneScroll } from '@/components/shell/PaneScroll';
import { Window } from '@/components/shell/Window';
import { useScreenRead, useSlice, type ScreenDef, type ScreenFrameProps } from '@/components/shell/host';
import { useShellInfo } from '@/components/shell/ShellContext';
import type { RunnerNeed } from '@/lib/runs/desk/types';
import { DecisionNotFound } from '../components/detail/DecisionNotFound';
import { NeedsItemPage } from '../components/detail/NeedsItemPage';
import type { NeedsItemView, NeedsYouView } from '../data/pick';
import { NeedsSession, useNeedsStore } from '../hooks/NeedsStore';
import { NeedsYouEmpty } from '../NeedsYouEmpty';
import { NeedsYouLive } from '../NeedsYouLive';
import { NeedsYouScreen } from '../NeedsYouScreen';

/** The view slice, handed to the store before paint when it is the desk; and whether the rows are the last visit's. */
function useView<V extends { kind: string; demo?: unknown }>() {
  const view = useSlice<V>('view');
  const { arrive } = useNeedsStore();
  useLayoutEffect(() => {
    if (view.state === 'ok' && view.data.kind === 'desk' && view.data.demo) arrive(view.data.demo as never);
  }, [view, arrive]);
  const read = useScreenRead();
  const v = view.state === 'ok' ? view.data : null;
  // a re-read of a screen already read: what shows is the last visit's, from when that read ended
  const stale = v && read.reading && read.asOf ? read.asOf : null;
  return { v, stale };
}

function NeedsFrame({ search }: ScreenFrameProps) {
  const { v, stale } = useView<NeedsYouView>();
  const { demo } = useNeedsStore();
  const desk = useSlice<{ runner: readonly RunnerNeed[] }>('desk');
  const runner = desk.state === 'ok' ? desk.data.runner : desk.state === 'error' ? [] : null;
  const mode = useShellInfo().data?.mode;
  if (v?.kind === 'empty' && v.demo) {
    return (
      <Window title="Needs you">
        <PaneScroll>
          <NeedsYouEmpty demo runner={runner ?? []} />
        </PaneScroll>
      </Window>
    );
  }
  if (v ? v.kind === 'desk' : mode !== 'live') return <NeedsYouScreen demo={demo} runner={runner} stale={stale} />;
  return (
    <NeedsYouLive
      view={v?.kind === 'live' ? v : null}
      empty={v?.kind === 'empty' ? <NeedsYouEmpty seeded={v.seeded} runner={runner ?? []} /> : undefined}
      runner={runner}
      wanted={search.get('item')}
      stale={stale}
    />
  );
}

function ItemFrame({ params }: ScreenFrameProps) {
  const { stale } = useView<NeedsItemView>();
  const { demo } = useNeedsStore();
  return <NeedsItemPage demo={demo} id={params.item ?? ''} stale={stale} />;
}

export const screens: readonly ScreenDef[] = [
  { key: 'needs-you', ready: true, slices: ['view', 'desk'], Frame: NeedsFrame, Session: NeedsSession, title: () => 'Afterlife · Needs you' },
  {
    key: 'needs-you/[item]',
    ready: true,
    slices: ['view'],
    Frame: ItemFrame,
    Session: NeedsSession,
    NotFound: DecisionNotFound,
    title: (p) => `Afterlife · Needs you · ${p.item}`,
  },
];
