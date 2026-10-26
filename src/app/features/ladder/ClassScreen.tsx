'use client';

import Link from 'next/link';
import { useCallback, useMemo, useRef, useState } from 'react';
import { DetailPage } from '@/components/shell/detail/DetailPage';
import { Reveal, Unread } from '@/components/shell/host';
import { useHotkeys } from '@/lib/keyboard/useHotkeys';
import { HelpContent } from './components/help/HelpContent';
import { keyRowsFor } from './components/help/keyRows';
import { ClassNotFound, ClassPending } from './components/inspector/ClassPending';
import { HeadStatus } from './components/chrome/HeadStatus';
import { ClassDetail } from './components/inspector/ClassDetail';
import inspector from './components/inspector/inspector.module.css';
import { useLadderActions } from './hooks/useLadderActions';
import { useLadderData } from './hooks/useLadderData';
import { useLadderMenus } from './hooks/useLadderMenus';
import { usePromoteWrite } from './hooks/usePromoteWrite';
import { useReceipts } from './hooks/useReceipts';
import { useRevokeWrite } from './hooks/useRevokeWrite';
import { useSimClock } from './hooks/useSimClock';
import { classLede, enrollLink } from './model/rules/lede';
import { promoteAsk } from './model/rules/promote';
import { ALL_KINDS } from './model/view/moves';
import type { ActorKind, Tier } from './model/types';
import type { HumanKeyRead } from '@/lib/promotion';
import type { LadderUnread } from './LadderScreen';
import type { LadderScreenProps } from './props';

/**
 * /ladder/[class]: one action class on its own page, in place of the Ladder's inspector drawer. On the screen host it
 * shares the list's state (screen/session.tsx): a revoke sent here, the demo's simulated one too, is the same move on the
 * list. Outside the host (a test) it keeps its own. `humanKey`: the promote write's precondition as the server read it
 * (its own late slice; absent: not read). Before the classes are read the page paints with dashes; a class the read does
 * not hold is not found.
 */
export function ClassScreen({ id, project, seed, tracks: trackList, means, policy, tiersStale, illustrative, live, feedAgeSec, subtitle, humanKey, unread, coreError }: LadderScreenProps & { id: string; humanKey?: HumanKeyRead; unread?: LadderUnread; coreError?: string }) {
  const data = useLadderData(seed, trackList, policy, id);
  const { state, byId, tracks } = data;
  const cls = byId[id];
  const [hoverTo, setHoverTo] = useState<Tier | null>(null);
  // A target r cannot send yet (q, an unhovered menu item): its write is put on screen first.
  const [pinned, setPinned] = useState<Tier | null>(null);
  const [kinds, setKinds] = useState<readonly ActorKind[]>(ALL_KINDS);
  const shownTo = hoverTo ?? pinned;
  const writes = useRevokeWrite(project, cls, shownTo);
  // The page shows both writes whole (r's and, when eligible or quarantined, p's): each key sends the one on screen.
  const promotion = cls ? data.promotionOf(cls) : null;
  const promoteWant = cls && promotion ? promoteAsk(cls, promotion) : null;
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
  // The keys this page binds; its "?" lists these (and Esc), not the list's j k, Enter, / and tier keys.
  const keys: Record<string, () => void> = {
    r: () => actions.revokeKey('step'),
    q: () => actions.revokeKey('quarantine'),
    p: () => actions.promote(id),
  };
  useHotkeys(Object.entries(keys).map(([key, handler]) => ({ key, handler })), !menus.isOpen && !!cls);

  if (!cls && !unread?.core) return <ClassNotFound />;
  const enroll = cls && promotion ? enrollLink(cls, promotion) : null;
  const toggleKind = (k: ActorKind) => setKinds((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));

  return (
    <DetailPage
      parent={{ label: 'Ladder', href: '/ladder' }}
      title={id}
      lede={
        cls && promotion ? (
          <>
            {classLede(cls, promotion)}
            {enroll ? <> · <Link href={enroll}>enroll {cls.track} in Setup ›</Link></> : null}
          </>
        ) : (
          <Unread label="class not read yet" />
        )
      }
      subtitle={subtitle}
      help={<HelpContent means={means} onReset={live ? undefined : actions.reset} rows={keyRowsFor(Object.keys(keys))} />}
      helpTitle="Keys and legend"
      status={
        cls ? (
          <>
            {cls.track} · <HeadStatus head={state.head} stale={tiersStale} live={live} elapsed={clock.elapsed} feedAgeSec={feedAgeSec} />
          </>
        ) : (
          <>
            <Unread label="track not read yet" /> · tier-state.yml @ <Unread label="head not read yet" />
          </>
        )
      }
    >
      <Reveal order={1} slice="core" className={inspector.cards}>
        {cls && promotion ? (
          <ClassDetail
            cls={cls}
            track={tracks[cls.track]}
            tracksDemo={illustrative.tracks}
            live={live}
            promotion={promotion}
            humanKey={humanKey}
            policy={policy}
            ledger={unread?.ledger ? null : state.ledger}
            kinds={kinds}
            onToggleKind={toggleKind}
            writeTo={shownTo}
            viewOf={writes.viewOf}
            promote={{ ask: promoteWant, view: promoteWant ? promos.viewOf(cls.id, promoteWant.to) : undefined }}
            onRevoke={actions.revoke}
            onTargets={menus.openTargets}
            onPromote={actions.promote}
          />
        ) : (
          <ClassPending reason={coreError} />
        )}
      </Reveal>
      {menus.menus}
    </DetailPage>
  );
}
