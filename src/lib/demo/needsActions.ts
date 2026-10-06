// Button labels of the ledgerline decisions (Fleet and Monitor inspectors): [what resolves it, the quiet alternative].
export const NEEDS_ACTIONS: Record<string, readonly [string, string]> = {
  n1: ['Open policy MR', 'Not now'],
  n2: ['Mark ready to sign', 'Open packet'],
  n3: ['Pick gaps…', 'Later'],
  n4: ['Re-admit at Assisted', 'Keep quarantined'],
  n5: ['Open runner page', 'Later'],
};
export const DEFAULT_NEEDS_ACTION: readonly [string, string] = ['Open', 'Later'];
