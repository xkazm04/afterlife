'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef } from 'react';
import { DetailPage } from '@/components/shell/detail/DetailPage';
import type { NeedsYouDemo } from '../../data/types';
import { useNeedsStore } from '../../hooks/NeedsStore';
import { useLeftSec } from '../../hooks/ClockProvider';
import { useReveal } from '../../hooks/useReveal';
import { itemLede } from '../../model/rows/lede';
import { rowView } from '../../model/rows/rowData';
import { NeedsLegend } from '../chrome/NeedsLegend';
import { NeedsInspector } from '../inspector/NeedsInspector';
import { InspScope } from '../inspector/Sec';

/**
 * /needs-you/[item]: one decision as short cards, with the buttons the list's inspector had. It shares the desk's state
 * with the list (the layout holds it), so a write staged here is in the list's outbox: staging sends the viewer back to
 * /needs-you, where the outbox is open and Run lives.
 */
export function NeedsItemPage({ demo, id }: { demo: NeedsYouDemo; id: string }) {
  const { s, dispatch } = useNeedsStore();
  const router = useRouter();
  const leftSec = useLeftSec(); // the layout's one clock: it does not restart when this page mounts
  const scope = useId(); // the cards' ids are this page's own: another item page may be kept hidden beside it
  useReveal(s.reveal, scope);
  // Selecting the decision is what asks the server for its exact write; the list keeps it selected on the way back.
  useEffect(() => dispatch({ type: 'select', id }), [id, dispatch]);
  const staged = useRef(s.out.length);
  useEffect(() => {
    if (s.out.length > staged.current && s.outboxOpen) router.push('/needs-you');
    staged.current = s.out.length;
  }, [s.out.length, s.outboxOpen, router]);

  const v = rowView(s, id, demo);
  const title = v?.title ?? id;
  return (
    <DetailPage
      parent={{ label: 'Needs you', href: '/needs-you' }}
      title={title}
      lede={itemLede(s, id, demo, leftSec)}
      status={`${title} · ${s.out.length} in outbox · nothing is sent until Run, in the outbox`}
      help={<NeedsLegend tierMeans={demo.tierMeans} />}
    >
      <InspScope value={scope}>
        <NeedsInspector id={id} s={s} demo={demo} leftSec={leftSec} dispatch={dispatch} />
      </InspScope>
    </DetailPage>
  );
}
