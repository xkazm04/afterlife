'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { DetailPage } from '@/components/shell/detail/DetailPage';
import { useHotkeys } from '@/lib/keyboard/useHotkeys';
import { HelpContent } from './components/help/HelpContent';
import { DemoChip } from './components/chrome/DemoChip';
import { TiersStale } from './components/chrome/TiersStale';
import { ClassDetail } from './components/inspector/ClassDetail';
import { useLadderActions } from './hooks/useLadderActions';
import { useLadderData } from './hooks/useLadderData';
import { useLadderMenus } from './hooks/useLadderMenus';
import { usePromoteWrite } from './hooks/usePromoteWrite';
import { useReceipts } from './hooks/useReceipts';
import { useRevokeWrite } from './hooks/useRevokeWrite';
import { useSimClock } from './hooks/useSimClock';
import { livePollAge, pollAge } from './model/clock';
import { classLede } from './model/rules/lede';
import { promoteAsk } from './model/rules/promote';
import { ALL_KINDS } from './model/view/moves';
import type { ActorKind, Tier } from './model/types';
import type { LadderScreenProps } from './props';

/**
 * /ladder/[class]: one action class on its own page, in place of the Ladder's inspector drawer. It holds its own copy of
 * the ledger state (the same reducer), so a revoke sent from here lands on this page; the Ladder reads the data source
 * afresh when you go back (live: the write is in belay-policy; demo: the simulated move is not carried back).
 */
export function ClassScreen({ id, project, seed, tracks: trackList, means, policy, tiersStale, illustrative, live, feedAgeSec, subtitle }: LadderScreenProps & { id: string }) {
  const data = useLadderData(seed, trackList, policy, id);
  const { state, byId, tracks } = data;
  const cls = byId[id]!;
  const [hoverTo, setHoverTo] = useState<Tier | null>(null);
  // A target r cannot send yet (q, an unhovered menu item): its write is put on screen first.
  const [pinned, setPinned] = useState<Tier | null>(null);
  const [kinds, setKinds] = useState<readonly ActorKind[]>(ALL_KINDS);
  const shownTo = hoverTo ?? pinned;
  const writes = useRevokeWrite(project, cls, shownTo);
  // The page shows both writes whole (r's and, when eligible or quarantined, p's): each key sends the one on screen.
  const promotion = data.promotionOf(cls);
  const promoteWant = promoteAsk(cls, promotion);
  const promos = usePromoteWrite(project, promoteWant);
  const promoteScreen = useMemo(() => ({ shown: () => true, show: () => undefined }), []);
  const revokeShown = useCallback(() => true, []);
  const clock = useSimClock(live);
  const tableRef = useRef<HTMLDivElement>(null);
  const onReset = useCallback(() => {
    setHoverTo(null);
    setPinned(null);
  }, []);
  const onShow = useCallback((_id: string, to: Tier) => setPinned(to), []);
  const noop = useCallback(() => undefined, []);
  const actions = useLadderActions({ project, data, writes, promos, promoteScreen, revokeShown, stamp: clock.stamp, seed, tableRef, openDetail: noop, onReset, onShow });
  const menus = useLadderMenus({ data, actions, writes, onHover: setHoverTo });
  useReceipts(live, seed, state.classes.some((c) => c.pending), data.dispatch);
  useHotkeys(
    [
      { key: 'r', handler: () => actions.revokeKey('step') },
      { key: 'q', handler: () => actions.revokeKey('quarantine') },
      { key: 'p', handler: () => actions.promote(id) },
    ],
    !menus.isOpen,
  );

  const age = live ? livePollAge(clock.elapsed, feedAgeSec) : pollAge(clock.elapsed, feedAgeSec);
  const toggleKind = (k: ActorKind) => setKinds((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));

  return (
    <DetailPage
      parent={{ label: 'Ladder', href: '/ladder' }}
      title={cls.id}
      lede={classLede(cls, promotion)}
      subtitle={subtitle}
      help={<HelpContent means={means} onReset={actions.reset} />}
      helpTitle="Keys and legend"
      status={
        <>
          {cls.track} · tier-state.yml @ {state.head.sha} <DemoChip on={!!state.head.demo} what="The tier-state.yml head" />
          <TiersStale stale={tiersStale} /> · polled {age} s ago
        </>
      }
    >
      <ClassDetail
        cls={cls}
        track={tracks[cls.track]}
        tracksDemo={illustrative.tracks}
        promotion={promotion}
        policy={policy}
        ledger={state.ledger}
        kinds={kinds}
        onToggleKind={toggleKind}
        writeTo={shownTo}
        viewOf={writes.viewOf}
        promote={{ ask: promoteWant, view: promoteWant ? promos.viewOf(cls.id, promoteWant.to) : undefined }}
        onRevoke={actions.revoke}
        onTargets={menus.openTargets}
        onPromote={actions.promote}
        live={live}
      />
      {menus.menus}
    </DetailPage>
  );
}
