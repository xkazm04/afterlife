'use client';

import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { useToast } from '@/components/overlays/toast/useToast';
import { TIER_META } from '@/lib/tiers';
import { NO_ANSWER, commitOf, outcomeOf } from '@/server/actions/words';
import { actsFrom, revokeTarget } from '../model/rules/tiers';
import { PENDING_MS, nextSha } from '../model/state/commit';
import type { LadderSeed } from '../model/state/state';
import type { Ceiling, Tier } from '../model/types';
import { sendRevoke, writeKey } from '../write/revoke';
import type { LadderData } from './useLadderData';
import { usePromoteAction, type PromoteScreen } from './usePromoteAction';
import type { PromoteWrites } from './usePromoteWrite';
import type { RevokeWrites } from './useRevokeWrite';

/** How long the "just landed" flash stays on a row and a new ledger entry. */
const FRESH_MS = 1700;

/**
 * Everything the screen does: select, filter, sort, and the writes. A revoke confirms the write the server planned
 * (confirmAction) and moves the row only when the answer is done; the toast says what the answer says. In demo mode the
 * write is simulated, and six seconds later a simulated tier-gate read settles it. A promotion confirms the policy MR the
 * server planned (usePromoteAction). Belay writes only on a click or a key.
 */
export function useLadderActions({
  project,
  data,
  writes,
  promos,
  promoteScreen,
  revokeShown,
  stamp,
  seed,
  tableRef,
  openDetail,
  onReset,
  onShow,
}: {
  /** The project the classes belong to (the index id the server actions take). */
  project: string;
  data: LadderData;
  writes: RevokeWrites;
  /** The promotions on screen, and where: p sends only the one the screen shows. */
  promos: PromoteWrites;
  promoteScreen: PromoteScreen;
  /** Is the revoke of `id` on screen (not replaced on the dock by its promotion)? */
  revokeShown: (id: string) => boolean;
  stamp: () => string;
  seed: LadderSeed;
  tableRef: RefObject<HTMLDivElement | null>;
  openDetail: (id?: string) => void;
  onReset: () => void;
  /** Put the write of revoking `id` to `to` on screen (the dock and the class page), before anything can send it. */
  onShow: (id: string, to: Tier) => void;
}) {
  const { toast, status } = useToast();
  const sending = useRef(new Set<string>());
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const latest = useRef(data);
  useEffect(() => {
    latest.current = data;
  });
  useEffect(() => {
    const live = timers.current;
    return () => live.forEach(clearTimeout);
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  }, []);
  const focusTable = useCallback(() => tableRef.current?.focus({ preventScroll: true }), [tableRef]);
  const { dispatch } = data;

  const select = useCallback((id: string) => dispatch({ type: 'select', id }), [dispatch]);

  /** The server answered done: the row moves. A simulated (demo) commit is settled by a simulated tier-gate read. */
  const landed = useCallback(
    (id: string, to: Tier, simulated: boolean, commit: string | null) => {
      const sha = simulated ? nextSha(latest.current.state.shaIdx) : commit;
      dispatch({ type: 'revoke', id, to, t: stamp(), sent: simulated ? { simulated: true } : { simulated: false, commit } });
      later(() => dispatch({ type: 'clearFresh' }), FRESH_MS);
      if (simulated && sha) {
        later(() => {
          dispatch({ type: 'settle', sha, t: stamp() });
          later(() => dispatch({ type: 'clearFresh' }), FRESH_MS);
        }, PENDING_MS);
      }
      writes.clear();
      promos.clear(); // tier-state.yml moved: a promotion planned from the old one would only come back "changed"
    },
    [dispatch, stamp, later, writes, promos],
  );

  /**
   * r, the button or a menu target: confirm the write the server planned for it (on screen on the class page and the
   * dock), and only that one. Without it on screen nothing is sent. The toast says only what the answer says.
   */
  const revoke = useCallback(
    (id: string, to: Tier) => {
      const key = writeKey(id, to);
      const view = writes.viewOf(id, to);
      dispatch({ type: 'select', id });
      if (view?.kind !== 'preview' || !revokeShown(id)) {
        onShow(id, to);
        if (view?.kind === 'refused') return status(`Nothing sent · ${view.reason}`);
        return status(view ? 'Nothing sent · the exact write is on screen now; press again to send it' : 'Nothing sent · the exact write is not on screen yet; press again once it shows');
      }
      if (sending.current.has(key)) return status('Already sending this write');
      sending.current.add(key);
      status(`Sending ${id} → ${TIER_META[to].name}…`);
      sendRevoke(project, id, to, view)
        .then((r) => {
          const o = r && outcomeOf(r, `${id} → ${TIER_META[to].name}`);
          if (!o) return;
          toast(o.text);
          if (o.status === 'done') {
            landed(id, to, o.simulated, r.status === 'done' ? commitOf(r.results) : null);
            status(o.simulated ? 'Demo: going back up is a policy MR a person merges (p)' : 'No undo: going back up is a policy MR a person merges (p)');
          } else if (o.status === 'changed') writes.put(id, to, { kind: 'preview', preview: o.preview });
          else if (o.status === 'refused') writes.put(id, to, { kind: 'refused', reason: o.reason });
        }, () => toast(NO_ANSWER))
        .finally(() => sending.current.delete(key));
      focusTable();
    },
    [dispatch, writes, project, landed, onShow, revokeShown, toast, status, focusTable],
  );

  const promote = usePromoteAction(project, data, promos, promoteScreen);

  /** `r` revokes one step, `q` quarantines, both on the selected class. */
  const revokeKey = useCallback(
    (want: 'step' | 'quarantine') => {
      const c = latest.current.selected;
      if (!c) return status('Select a class · r revokes one step');
      const to = revokeTarget(actsFrom(c), want);
      if (to) revoke(c.id, to);
      else status(want === 'quarantine' ? `Nothing to quarantine on ${c.id}` : `Nothing to revoke on ${c.id}`);
    },
    [revoke, status],
  );

  const setSource = useCallback(
    (src: string) => {
      dispatch({ type: 'source', src });
      if (tableRef.current) tableRef.current.scrollTop = 0;
    },
    [dispatch, tableRef],
  );
  const setFilter = useCallback((tier: Ceiling | null) => dispatch({ type: 'filter', tier }), [dispatch]);

  const reset = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current.clear();
    dispatch({ type: 'reset', seed });
    onReset();
    toast('Demo reset');
  }, [dispatch, seed, onReset, toast]);

  return { select, revoke, promote, revokeKey, setSource, setFilter, reset, openDetail, focusTable, flash: status };
}

export type LadderActions = ReturnType<typeof useLadderActions>;
