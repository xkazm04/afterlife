'use client';

import type { RefObject } from 'react';
import { useKeymap } from '@/lib/keyboard/keymap';
import { useHotkeys } from '@/lib/keyboard/useHotkeys';
import type { Ceiling } from '../model/types';
import { TIER_DISPLAY_ORDER } from '@/lib/tiers';
import { LADDER_KEYMAP } from '../model/keymap';
import { stepClass } from '../model/view/rows';
import type { LadderActions } from './useLadderActions';
import type { LadderData } from './useLadderData';

/**
 * The Ladder's keys, document-wide, declared in model/keymap.ts: j k r q p / ? 1-5 0 Esc. (Arrow keys, Home, End, Enter and the context-menu key
 * belong to the focused table.) Off while a menu is open: the menu has its own keys.
 */
export function useLadderKeys({
  data,
  actions,
  searchRef,
  enabled,
  toggleHelp,
}: {
  data: LadderData;
  actions: LadderActions;
  searchRef: RefObject<HTMLInputElement | null>;
  enabled: boolean;
  toggleHelp: () => void;
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
  };

  const keys = useKeymap(LADDER_KEYMAP, {
    step: [step(1), step(-1)],
    search: focusSearch,
    tier: [tier(null), ...TIER_DISPLAY_ORDER.map(tier)],
    promote: () => actions.promote(),
    revoke: [() => actions.revokeKey('step'), () => actions.revokeKey('quarantine')],
    help: toggleHelp,
    escape,
  });
  useHotkeys(keys, enabled);
}
