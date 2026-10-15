'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/components/overlays/toast/useToast';
import { TIER_META } from '@/lib/tiers';
import { readmitId, whyNot } from '@/lib/promotion';
import { NO_ANSWER, mrOf, outcomeOf } from '@/server/actions/words';
import { promoteAsk, sentWords } from '../model/rules/promote';
import { promoteIntent, sendPromote } from '../write/promote';
import { writeKey } from '../write/revoke';
import type { LadderData } from './useLadderData';
import type { PromoteWrites } from './usePromoteWrite';

/** Where the promotion's write is on screen: the class page shows it whole; the list's dock shows one write at a time. */
export interface PromoteScreen {
  /** Is the promotion of `id` on screen now, so p may send it? */
  shown: (id: string) => boolean;
  /** Put it on screen (the dock), before anything can send it. */
  show: (id: string) => void;
}

/**
 * p, Promote or Re-admit: confirm the policy MR the server planned for the class (on screen on the class page and the
 * dock), and only that one. Without it on screen nothing is sent and the status line says so. A class the rule does not
 * call eligible (or a quarantine) sends nothing and names why. Done names the MR from the server's answer; a demo answer
 * is simulated and says so. Belay never merges it: a person does, in GitLab.
 */
export function usePromoteAction(project: string, data: LadderData, promos: PromoteWrites, screen: PromoteScreen) {
  const { toast, status } = useToast();
  const sending = useRef(new Set<string>());
  const latest = useRef({ data, promos, screen });
  useEffect(() => {
    latest.current = { data, promos, screen };
  });

  return useCallback(
    (id?: string) => {
      const { data: d, promos: w, screen: on } = latest.current;
      const c = (id && d.byId[id]) || d.selected;
      if (!c) return status('Select a class to promote');
      const p = d.promotionOf(c);
      const a = promoteAsk(c, p);
      if (!a) return status(`Promote is greyed for ${c.id}: ${whyNot(p)}`);
      d.dispatch({ type: 'select', id: c.id });
      const key = writeKey(a.id, a.to);
      const view = w.viewOf(a.id, a.to);
      const what = `${a.id} → ${TIER_META[a.to].name}`;
      if (view?.kind === 'sent') return status(`Already sent · ${what} · ${sentWords(view)}`);
      if (view?.kind !== 'preview' || !on.shown(a.id)) {
        on.show(a.id);
        if (view?.kind === 'refused') return status(`Nothing sent · ${view.reason}`);
        return status(view ? 'Nothing sent · the exact write is on screen now; press p again to send it' : 'Nothing sent · the exact write is not on screen yet; press again once it shows');
      }
      if (sending.current.has(key)) return status('Already sending this write');
      sending.current.add(key);
      status(`Sending ${what} as a policy MR…`);
      // a re-admit always names its Needs-you item: closing one that is not open is a no-op, so no second MR is planned there
      const proposal = a.proposal ?? (a.readmit ? readmitId(project, a.id) : undefined);
      sendPromote(promoteIntent(project, a.id, a.to, proposal), view)
        .then((r) => {
          const o = r && outcomeOf(r, what);
          if (!o) return;
          toast(o.text);
          if (o.status === 'done') {
            const mr = r.status === 'done' ? mrOf(r.results) : null;
            const url = (r.status === 'done' && r.results.find((x) => x.made === mr)?.url) || null;
            const sent = { kind: 'sent' as const, mr, url, simulated: o.simulated };
            latest.current.promos.put(a.id, a.to, sent);
            status(sentWords(sent));
          } else if (o.status === 'changed') latest.current.promos.put(a.id, a.to, { kind: 'preview', preview: o.preview });
          else if (o.status === 'refused') latest.current.promos.put(a.id, a.to, { kind: 'refused', reason: o.reason });
        }, () => toast(NO_ANSWER))
        .finally(() => sending.current.delete(key));
    },
    [project, status, toast],
  );
}
