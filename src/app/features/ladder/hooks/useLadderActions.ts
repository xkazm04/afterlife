'use client';

import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/overlays/toast/useToast';
import { outcomeText, wentThrough } from '@/components/write/outcome';
import type { ActionResponse } from '@/server/actions/types';
import { TIER_META } from '@/lib/tiers';
import { WHY_NOT } from '../model/rules/promotion';
import { revokeTarget } from '../model/rules/tiers';
import { PENDING_MS, nextSha } from '../model/state/commit';
import type { LadderSeed } from '../model/state/state';
import type { Ceiling, Tier } from '../model/types';
import type { LadderData } from './useLadderData';

const NEEDS_YOU = '/needs-you';
/** How long the "just landed" flash stays on a row and a new ledger entry. */
const FRESH_MS = 1700;
/** The pause between the promote toast and the jump to Needs you. */
const PROMOTE_JUMP_MS = 900;

/**
 * Everything the screen does: select, filter, sort, and the writes. A revoke goes to the server first (`send`: the plan
 * the dock showed, confirmed); only if it went through does the row move, with a toast and the no-undo note, and six
 * seconds later the simulated tier-gate job reads the commit. A refusal moves nothing. Belay writes only on a click or a key.
 */
export function useLadderActions({
  data,
  stamp,
  seed,
  tableRef,
  openDetail,
  onReset,
  send,
}: {
  data: LadderData;
  stamp: () => string;
  seed: LadderSeed;
  tableRef: RefObject<HTMLDivElement | null>;
  openDetail: (id?: string) => void;
  onReset: () => void;
  send: (id: string, to: Tier) => Promise<ActionResponse>;
}) {
  const { toast, status } = useToast();
  const router = useRouter();
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

  const apply = useCallback(
    (id: string, to: Tier, r: ActionResponse) => {
      const sha = nextSha(latest.current.state.shaIdx);
      dispatch({ type: 'revoke', id, to, t: stamp() });
      later(() => dispatch({ type: 'clearFresh' }), FRESH_MS);
      later(() => {
        dispatch({ type: 'settle', sha, t: stamp() });
        later(() => dispatch({ type: 'clearFresh' }), FRESH_MS);
      }, PENDING_MS);
      toast(`${id} → ${TIER_META[to].name} · ${outcomeText(r)}`);
      status('No undo: going back up is a policy MR a person merges (Needs you)');
    },
    [dispatch, stamp, later, toast, status],
  );

  const revoke = useCallback(
    (id: string, to: Tier) => {
      status(`Revoking ${id} → ${TIER_META[to].name}: the server checks and sends the plan…`);
      focusTable();
      void send(id, to).then(
        (r) => (wentThrough(r) ? apply(id, to, r) : status(outcomeText(r))),
        () => status(`Not sent: the server could not be reached. ${id} is unchanged.`),
      );
    },
    [send, apply, status, focusTable],
  );

  const promote = useCallback(
    (id?: string) => {
      const d = latest.current;
      const c = (id && d.byId[id]) || d.selected;
      if (!c) return status('Select a class to promote');
      const p = d.promotionOf(c);
      if (p.kind === 'eligible') {
        toast(`${c.id} → ${TIER_META[p.next].name} goes through a policy MR a person merges · opening Needs you…`);
        later(() => router.push(NEEDS_YOU), PROMOTE_JUMP_MS);
      } else status(`Promote is greyed for ${c.id}: ${WHY_NOT[p.kind]}`);
    },
    [later, router, status, toast],
  );

  /** `r` revokes one step, `q` quarantines, both on the selected class. */
  const revokeKey = useCallback(
    (want: 'step' | 'quarantine') => {
      const c = latest.current.selected;
      if (!c) return status('Select a class · r revokes one step');
      const to = revokeTarget(c.tier, want);
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
