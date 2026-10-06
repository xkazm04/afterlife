'use client';

import type { RefObject } from 'react';
import { useHotkeys, type Hotkey } from '@/lib/keyboard/useHotkeys';
import type { Ceiling } from '../model/types';
import { TIER_DISPLAY_ORDER } from '@/lib/tiers';
import { stepClass } from '../model/view/rows';
import type { LadderActions } from './useLadderActions';
import type { LadderData } from './useLadderData';

/**
 * The Ladder's keys, document-wide: j k r q p / ? 1-5 0 Esc. (Arrow keys, Home, End, Enter and the context-menu key
 * belong to the focused table; ⌘I belongs to the window.) Off while a menu is open: the menu has its own keys.
 */
export function useLadderKeys({
  data,
  actions,
  searchRef,
  enabled,
  toggleHelp,
  closeInspector,
}: {
  data: LadderData;
  actions: LadderActions;
  searchRef: RefObject<HTMLInputElement | null>;
  enabled: boolean;
  toggleHelp: () => void;
  closeInspector: () => void;
}) {
  const { state, dispatch } = data;
  const step = (delta: number) => () => {
    const id = stepClass(data.view.flat, data.sel, delta);
    if (id) actions.select(id);
  };
  const tier = (t: Ceiling | null) => () => {
    actions.setFilter(t);
    actions.focusTable();
  };
  const focusSearch = () => {
    searchRef.current?.focus();
    searchRef.current?.select();
  };
  const escape = (e: KeyboardEvent) => {
    const inSearch = e.target === searchRef.current;
    if (inSearch || state.q) dispatch({ type: 'query', q: '' });
    if (inSearch) actions.focusTable();
    else if (!state.q) closeInspector();
  };

  const keys: Hotkey[] = [
    { key: 'Escape', allowInInput: true, handler: escape },
    { key: 'j', handler: step(1) },
    { key: 'k', handler: step(-1) },
    { key: 'r', handler: () => actions.revokeKey('step') },
    { key: 'q', handler: () => actions.revokeKey('quarantine') },
    { key: 'p', handler: () => actions.promote() },
    { key: '/', handler: focusSearch },
    { key: '?', handler: toggleHelp },
    { key: '0', handler: tier(null) },
    ...TIER_DISPLAY_ORDER.map((t, i): Hotkey => ({ key: String(i + 1), handler: tier(t) })),
  ];
  useHotkeys(keys, enabled);
}
