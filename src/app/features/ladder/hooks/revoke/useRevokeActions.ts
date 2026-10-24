'use client';

import { useCallback, useRef, type RefObject } from 'react';
import { useToast } from '@/components/overlays/toast/useToast';
import { groupNavId, groupOfNavId } from '@/components/table/model/rowNavigation';
import { TIER_META } from '@/lib/tiers';
import type { ActionResponse } from '@/server/actions/types';
import { NO_ANSWER, commitOf, noAnswerOf, outcomeOf, type WriteView } from '@/server/actions/words';
import { nothingInTrack, trackChanges, type TrackWant } from '../../model/rules/batch/batch';
import { actsFrom, revokeTarget, selectHint } from '../../model/rules/tiers';
import { PENDING_MS, nextSha } from '../../model/state/commit';
import type { Change, Tier } from '../../model/types';
import { sendRevoke, sendRevokeTrack, trackKey, writeKey } from '../../write/revoke';
import type { LadderData } from '../useLadderData';
import type { PromoteWrites } from '../usePromoteWrite';
import type { RevokeWrites } from '../useRevokeWrite';

/** How long the "just landed" flash stays on a row and a new ledger entry. */
const FRESH_MS = 1700;

/** What lands once the server answered done: one class, or every change of a track. The instant and the answer are added then. */
type Landing = { type: 'revoke'; id: string; to: Tier } | { type: 'revokeTrack'; track: string; changes: readonly Change[] };

/** One write the screen can send: what the toast calls it, the view on screen, and how to show, send and replace it. */
interface Shown {
  key: string;
  what: string;
  view: WriteView | undefined;
  /** Is this write the one on screen (and not, say, the promotion the dock shows instead)? */
  shown: boolean;
  show: () => void;
  send: () => Promise<ActionResponse | null>;
  put: (view: WriteView) => void;
  land: Landing;
}

/**
 * The revokes: r, q, the button or a menu target confirm the write the server planned for it (on screen on the class page
 * and the dock), and only that one; on a track header, the write that lowers the whole track in one commit. Without it on
 * screen nothing is sent. The row moves only when the answer is done; the toast says only what the answer says. In demo
 * mode the write is simulated, and six seconds later a simulated tier-gate read settles it.
 */
export function useRevokeActions({
  project,
  latest,
  dispatch,
  writes,
  promos,
  revokeShown,
  onShow,
  stamp,
  later,
  focusTable,
  simCountRef,
}: {
  project: string;
  latest: RefObject<LadderData>;
  dispatch: LadderData['dispatch'];
  writes: RevokeWrites;
  promos: PromoteWrites;
  revokeShown: (id: string) => boolean;
  onShow: (id: string, to: Tier) => void;
  stamp: () => number;
  later: (fn: () => void, ms: number) => void;
  focusTable: () => void;
  /** Simulated commits handed out: bumped when asked, so two answers in one render get two ids (reset zeroes it). */
  simCountRef: RefObject<number>;
}) {
  const { toast, status } = useToast();
  const sending = useRef(new Set<string>());

  /** The server answered done: the rows move. A simulated (demo) commit is settled by a simulated tier-gate read. */
  const landed = useCallback(
    (land: Landing, simulated: boolean, commit: string | null) => {
      // The hook names the demo id and the action carries it, so the row's pending id and the settle timer's are one.
      const sha = simulated ? nextSha(simCountRef.current++) : commit;
      dispatch({ ...land, at: stamp(), sent: simulated ? { simulated: true } : { simulated: false, commit }, ...(simulated && sha ? { sha } : {}) });
      later(() => dispatch({ type: 'clearFresh' }), FRESH_MS);
      if (simulated && sha) {
        later(() => {
          dispatch({ type: 'settle', sha, at: stamp() });
          later(() => dispatch({ type: 'clearFresh' }), FRESH_MS);
        }, PENDING_MS);
      }
      writes.clear();
      promos.clear(); // tier-state.yml moved: a promotion planned from the old one would only come back "changed"
    },
    [simCountRef, dispatch, stamp, later, writes, promos],
  );

  const sendShown = useCallback(
    (w: Shown) => {
      if (w.view?.kind !== 'preview' || !w.shown) {
        w.show();
        if (w.view?.kind === 'refused') return status(`Nothing sent · ${w.view.reason}`);
        return status(w.view ? 'Nothing sent · the exact write is on screen now; press again to send it' : 'Nothing sent · the exact write is not on screen yet; press again once it shows');
      }
      if (sending.current.has(w.key)) return status('Already sending this write');
      sending.current.add(w.key);
      status(`Sending ${w.what}…`);
      w.send()
        .then((r) => {
          const o = r && outcomeOf(r, w.what);
          if (!o) return;
          toast(o.text);
          if (o.status === 'done') {
            landed(w.land, o.simulated, r.status === 'done' ? commitOf(r.results) : null);
            status(o.simulated ? 'Demo: going back up is a policy MR a person merges (p)' : 'No undo: going back up is a policy MR a person merges (p)');
          } else if (o.status === 'changed') w.put({ kind: 'preview', preview: o.preview });
          else if (o.status === 'refused') w.put({ kind: 'refused', reason: o.reason });
        }, (e: unknown) => {
          toast(NO_ANSWER);
          status(`${w.what}: ${noAnswerOf(e)}`);
        })
        .finally(() => sending.current.delete(w.key));
      focusTable();
    },
    [landed, toast, status, focusTable],
  );

  const revoke = useCallback(
    (id: string, to: Tier) => {
      dispatch({ type: 'select', id });
      const view = writes.viewOf(id, to);
      const send = () => sendRevoke(project, id, to, view);
      const what = `${id} → ${TIER_META[to].name}`;
      sendShown({ key: writeKey(id, to), what, view, shown: revokeShown(id), show: () => onShow(id, to), send, put: (v) => writes.put(id, to, v), land: { type: 'revoke', id, to } });
    },
    [dispatch, writes, project, revokeShown, onShow, sendShown],
  );

  /** Every class of `track` lowered in one commit: q quarantines, r takes each one step down. */
  const revokeTrack = useCallback(
    (track: string, want: TrackWant) => {
      const batch = trackChanges(latest.current.state.classes, track, want);
      if (!batch.changes.length) return status(`Nothing sent · ${track}: ${nothingInTrack(batch)}`);
      const { changes } = batch;
      const view = writes.trackViewOf(track, want);
      const send = () => sendRevokeTrack(project, track, changes, want, view);
      const what = `${want === 'quarantine' ? 'quarantine' : 'one step down'} · track ${track} · ${changes.length} classes`;
      const shown = latest.current.sel === groupNavId(track) && writes.trackWant === want;
      sendShown({ key: trackKey(track, want), what, view, shown, show: () => writes.showTrack(track, want), send, put: (v) => writes.putTrack(track, want, v), land: { type: 'revokeTrack', track, changes } });
    },
    [latest, writes, project, status, sendShown],
  );

  /** `r` revokes one step, `q` quarantines: the selected class, or every class of the selected track header. */
  const revokeKey = useCallback(
    (want: TrackWant) => {
      const { selected: c, sel } = latest.current;
      if (!c) {
        const tid = sel ? groupOfNavId(sel) : null;
        return tid ? revokeTrack(tid, want) : status(selectHint(want));
      }
      const to = revokeTarget(actsFrom(c), want);
      if (to) revoke(c.id, to);
      else status(want === 'quarantine' ? `Nothing to quarantine on ${c.id}` : `Nothing to revoke on ${c.id}`);
    },
    [latest, revoke, revokeTrack, status],
  );

  return { revoke, revokeTrack, revokeKey };
}
