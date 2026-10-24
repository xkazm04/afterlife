// Button labels of the decisions (Fleet and Monitor inspectors): [what resolves it, the quiet alternative], by the item's
// kind, so a live item (id `readmit:<project>:<class>`) reads the same labels as the demo's n4.
import type { NeedsKind } from './deepTypes';

export const NEEDS_ACTIONS: Readonly<Record<NeedsKind, readonly [string, string]>> = {
  promote: ['Open policy MR', 'Not now'],
  signoff: ['Mark ready to sign', 'Open packet'],
  gaps: ['Pick gaps…', 'Later'],
  readmit: ['Re-admit at Assisted', 'Keep quarantined'],
  setup: ['Open runner page', 'Later'],
};
export const DEFAULT_NEEDS_ACTION: readonly [string, string] = ['Open', 'Later'];

/** The labels of an item's kind; a kind this table does not know (or an Object property name) reads the default. */
export const needsAction = (kind: string): readonly [string, string] =>
  Object.hasOwn(NEEDS_ACTIONS, kind) ? NEEDS_ACTIONS[kind as NeedsKind] : DEFAULT_NEEDS_ACTION;
