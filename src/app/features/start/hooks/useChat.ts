'use client';

import { useEffect, useRef, useState } from 'react';
import type { SetupAction, StartSnapshot } from '@/server/start/wire';
import { ask as askApi } from '../model/stack/api';
import type { ChatTurn, ChatView } from '../model/view';
import { useElapsed } from './useElapsed';

/**
 * "Ask Afterlife": stateless turns to POST /api/start/ask, each carrying the wizard as it stands now (the snapshot). A
 * reply is whole (10-40 s), so the thinking state counts seconds. A reply's action is one the server validated from the
 * setup catalogue; proposing it opens the same preview -> confirm as Run it.
 */
export function useChat(snapshot: StartSnapshot, propose: (a: SetupAction) => void): ChatView {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [since, setSince] = useState<number | null>(null);
  const [error, setError] = useState<string>();
  const latest = useRef(snapshot);
  useEffect(() => {
    latest.current = snapshot;
  });

  const ask = (text: string) => {
    const t = text.trim();
    if (!t || since !== null) return;
    const next: ChatTurn[] = [...turns, { role: 'you', text: t }];
    setTurns(next);
    setError(undefined);
    setSince(Date.now());
    void askApi(next.map(({ role, text: x }) => ({ role, text: x })), latest.current).then((a) => {
      setSince(null);
      if (a.ok) setTurns((x) => [...x, { role: 'afterlife', text: a.body.reply, ...(a.body.action ? { action: a.body.action } : {}) }]);
      else setError(a.error.code === 'claude-missing' ? `Claude Code was not found on this machine: ${a.error.error}` : a.error.error);
    });
  };

  return { open, toggle: () => setOpen((o) => !o), turns, ask, thinking: since !== null, elapsedS: useElapsed(since), error, propose };
}
