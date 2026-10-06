import type { ReactNode } from 'react';
import type { MenuAction } from '@/components/overlays/menu/menuModel';
import type { Tier } from '../../model/types';

// kit-candidate: the shared Menu has string-only items and no highlight callback. The Ladder needs a leading glyph
// (the tier mark) and to learn which item is highlighted (the docked strip previews the write for it).
export interface LadderMenuAction extends MenuAction {
  /** A glyph before the label (a TierMark). */
  lead?: ReactNode;
  /** The tier this item revokes to: the docked strip previews it while the item is highlighted. */
  to?: Tier;
}
export type LadderMenuEntry = LadderMenuAction | { sep: true } | { head: string };

export const isMenuAction = (e: LadderMenuEntry): e is LadderMenuAction => 'label' in e;
