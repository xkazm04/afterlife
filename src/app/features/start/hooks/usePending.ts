'use client';

import { useCallback, useRef, useState } from 'react';
import { confirmAction, previewAction } from '@/server/actions/actions';
import { noAnswerOf, outcomeOf, unreachable, viewOf } from '@/server/actions/words';
import type { SetupAction } from '@/server/start/wire';
import { actionTitle } from '../model/actions';
import type { StepKey } from '../model/types';
import type { PendingView } from '../model/view';

type Held = Omit<PendingView, 'confirm' | 'cancel'>;

/**
 * One setup action's round trip, from Run it or the chat's card: previewAction at once (the server's exact commands),
 * confirmAction of exactly that preview on the person's click, then the answer in words. save-project is the wizard's
 * own save (POST /api/start/save), so its confirm hands to `onSave`. A done write calls `onDone` (re-check, re-read).
 */
export function usePending(onSave: () => void, onDone: () => void): { pending: PendingView | null; run: (a: SetupAction, step: StepKey | null) => void } {
  const [held, setHeld] = useState<Held | null>(null);
  const token = useRef(0);

  const run = useCallback((action: SetupAction, step: StepKey | null) => {
    const me = ++token.current;
    const live = () => token.current === me;
    const base: Held = { step, action, title: actionTitle(action), busy: false, done: false };
    if (action.kind === 'save-project') return setHeld({ ...base, summary: 'Writes only the lines a probe confirmed, to Afterlife’s own data folder, never into the repo.' });
    setHeld(base);
    previewAction(action).then(
      (r) => live() && setHeld((h) => h && { ...h, preview: viewOf(r) }),
      (e: unknown) => live() && setHeld((h) => h && { ...h, preview: unreachable(e) }),
    );
  }, []);

  const confirm = useCallback(() => {
    if (!held || held.busy || held.done) return;
    if (held.action.kind === 'save-project') {
      onSave();
      setHeld(null);
      return;
    }
    const v = held.preview;
    if (v?.kind !== 'preview') return;
    const me = token.current;
    setHeld({ ...held, busy: true });
    confirmAction(held.action, v.preview.previewId).then(
      (r) => {
        if (token.current !== me) return;
        const o = outcomeOf(r, held.title);
        const preview = o?.status === 'changed' ? { kind: 'preview' as const, preview: o.preview } : o?.status === 'refused' || o?.status === 'failed' ? { kind: 'refused' as const, reason: o.text } : v;
        setHeld((h) => h && { ...h, busy: false, preview, result: o?.text, done: o?.status === 'done' });
        if (o?.status === 'done') onDone();
      },
      (e: unknown) => token.current === me && setHeld((h) => h && { ...h, busy: false, result: noAnswerOf(e) }),
    );
  }, [held, onSave, onDone]);

  const cancel = useCallback(() => {
    token.current++;
    setHeld(null);
  }, []);

  return { pending: held ? { ...held, confirm, cancel } : null, run };
}
