'use client';

import { useCallback, useEffect, useRef } from 'react';
import { sendNow, useServerWrites } from '@/components/write/useServerWrites';
import type { DockModel } from '../model/rules/dock';
import type { Tier } from '../model/types';
import { revokeIntent } from '../model/write';

/**
 * The revoke the dock shows is planned on the server as it is shown (selection, or the menu item under the pointer),
 * so the dock carries the server's command. `send` confirms exactly that plan when it is the one asked for; any other
 * revoke is planned and confirmed in one go. Either way the server refuses what may not be done.
 */
export function useRevokeWrites(dm: DockModel) {
  const intent = dm.kind === 'write' ? revokeIntent(dm.id, dm.to) : null;
  const { entries, confirm } = useServerWrites({ dock: intent });
  const latest = useRef(dm);
  useEffect(() => {
    latest.current = dm;
  });
  const send = useCallback(
    (id: string, to: Tier) => {
      const d = latest.current;
      return d.kind === 'write' && d.id === id && d.to === to ? confirm('dock') : sendNow(revokeIntent(id, to));
    },
    [confirm],
  );
  return { dock: entries.dock, send };
}
