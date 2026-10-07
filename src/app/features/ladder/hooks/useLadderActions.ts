'use client';

import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/overlays/toast/useToast';
import { TIER_META } from '@/lib/tiers';
import { NO_ANSWER, commitOf, outcomeOf } from '@/server/actions/words';
import { promotionId, whyNot } from '../model/rules/promotion';
import { actsFrom, revokeTarget } from '../model/rules/tiers';
import { PENDING_MS, nextSha } from '../model/state/commit';
import type { LadderSeed } from '../model/state/state';
import type { Ceiling, Tier } from '../model/types';
import { sendRevoke, writeKey } from '../write/revoke';
import type { LadderData } from './useLadderData';
import type { RevokeWrites } from './useRevokeWrite';

const NEEDS_YOU = '/needs-you';
/** How long the "just landed" flash stays on a row and a new ledger entry. */
const FRESH_MS = 1700;
/** The pause between the promote toast and the jump to Needs you. */
const PROMOTE_JUMP_MS = 900;

/**
 * Everything the screen does: select, filter, sort, and the writes. A revoke confirms the write the server planned
 * (confirmAction) and moves the row only when the answer is done; the toast says what the answer says. In demo mode the
 * write is simulated, and six seconds later a simulated tier-gate read settles it. Belay writes only on a click or a key.
 */
export function useLadderActions({
  project,
  live,
  data,
  writes,
  stamp,
  seed,
  tableRef,
  openDetail,
  onReset,
  onShow,
}: {
  /** The project the classes belong to (the index id the server actions take). */
  project: string;
  /** Live: an eligible class opens Needs you on the promotion the poll opened for it (demo: the desk). */
  live: boolean;
  data: LadderData;
  writes: RevokeWrites;
  stamp: () => string;
  seed: LadderSeed;
  tableRef: RefObject<HTMLDivElement | null>;
  openDetail: (id?: string) => void;
  onReset: () => void;
  /** Put the write of revoking `id` to `to` on screen (the dock and the inspector), before anything can send it. */
  onShow: (id: string, to: Tier) => void;
}) {
  const { toast, status } = useToast();
  const router = useRouter();
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
    },
    [dispatch, stamp, later, writes],
  );

  /**
   * r, the button or a menu target: confirm the write the server planned for it (on screen in the inspector and the
   * dock), and only that one. Without it on screen nothing is sent. The toast says only what the answer says.
   */
  const revoke = useCallback(
    (id: string, to: Tier) => {
      const key = writeKey(id, to);
      const view = writes.viewOf(id, to);
      dispatch({ type: 'select', id });
      if (view?.kind !== 'preview') {
        onShow(id, to);
        return status(view ? `Nothing sent · ${view.reason}` : 'Nothing sent · the exact write is not on screen yet; press again once it shows');
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
            status(o.simulated ? 'Demo: going back up is a policy MR a person merges (Needs you)' : 'No undo: going back up is a policy MR a person merges (Needs you)');
          } else if (o.status === 'changed') writes.put(id, to, { kind: 'preview', preview: o.preview });
          else if (o.status === 'refused') writes.put(id, to, { kind: 'refused', reason: o.reason });
        }, () => toast(NO_ANSWER))
        .finally(() => sending.current.delete(key));
      focusTable();
    },
    [dispatch, writes, project, landed, onShow, toast, status, focusTable],
  );

  const promote = useCallback(
    (id?: string) => {
      const d = latest.current;
      const c = (id && d.byId[id]) || d.selected;
      if (!c) return status('Select a class to promote');
      const p = d.promotionOf(c);
      if (p.kind === 'eligible') {
        toast(`${c.id} → ${TIER_META[p.next].name} goes through a policy MR a person merges · opening Needs you…`);
        const to = live ? `${NEEDS_YOU}?item=${encodeURIComponent(promotionId(project, c.id))}` : NEEDS_YOU;
        later(() => router.push(to), PROMOTE_JUMP_MS);
      } else status(`Promote is greyed for ${c.id}: ${whyNot(p)}`);
    },
    [later, router, status, toast, live, project],
  );

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
