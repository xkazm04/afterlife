'use client';

import { useEffect, useId, useRef } from 'react';
import { DetailPage } from '@/components/shell/detail/DetailPage';
import { Reveal, Unread, useHostNav } from '@/components/shell/host';
import type { NeedsYouDemo } from '../../data/types';
import { useNeedsStore } from '../../hooks/NeedsStore';
import { useLeftSec } from '../../hooks/ClockProvider';
import { useReveal } from '../../hooks/useReveal';
import { itemLede } from '../../model/rows/lede';
import { rowView } from '../../model/rows/rowData';
import { NeedsLegend } from '../chrome/NeedsLegend';
import { NeedsInspector } from '../inspector/NeedsInspector';
import { InspScope } from '../inspector/Sec';
import { StaleRegion } from '../shared/StaleRegion';
import styles from './detail.module.css';

/**
 * /needs-you/[item]: one decision as short cards, with the buttons the list's inspector had. It shares the desk's state
 * with the list (the screen host's Session holds it), so a write staged here is in the list's outbox: staging sends the
 * viewer back to /needs-you, where the outbox is open and Run lives. `demo` null: the desk is not read yet (the title is
 * the URL's id, the cards a dash); `stale`: the cards are the last visit's, re-reading, and cannot be acted on.
 */
export function NeedsItemPage({ demo, id, stale = null }: { demo: NeedsYouDemo | null; id: string; stale?: string | null }) {
  const { s, dispatch } = useNeedsStore();
  const { navigate } = useHostNav();
  const leftSec = useLeftSec(); // the store's one clock: it does not restart when this page mounts
  const scope = useId(); // the cards' ids are this page's own: another item page may be kept hidden beside it
  useReveal(s.reveal, scope);
  // Selecting the decision is what asks the server for its exact write; the list keeps it selected on the way back.
  useEffect(() => dispatch({ type: 'select', id }), [id, dispatch, demo]);
  const staged = useRef(s.out.length);
  useEffect(() => {
    if (s.out.length > staged.current && s.outboxOpen) navigate('/needs-you');
    staged.current = s.out.length;
  }, [s.out.length, s.outboxOpen, navigate]);

  const v = demo ? rowView(s, id, demo) : null;
  const title = v?.title ?? id;
  return (
    <DetailPage
      parent={{ label: 'Needs you', href: '/needs-you' }}
      title={title}
      lede={demo ? itemLede(s, id, demo, leftSec) : <Unread label="the decision is not read yet" />}
      status={`${title} · ${s.out.length} in outbox · nothing is sent until Run, in the outbox`}
      help={demo ? <NeedsLegend tierMeans={demo.tierMeans} /> : undefined}
    >
      <StaleRegion asOf={stale} label="The decision" className={styles.cards}>
        <Reveal order={1} slice="view" className={styles.cards}>
          {demo ? (
            <InspScope value={scope}>
              <NeedsInspector id={id} s={s} demo={demo} leftSec={leftSec} dispatch={dispatch} />
            </InspScope>
          ) : (
            <Unread label="the decision is not read yet" />
          )}
        </Reveal>
      </StaleRegion>
    </DetailPage>
  );
}
