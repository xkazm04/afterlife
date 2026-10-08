// The server intent behind a revoke: lower one class in tier-state.yml, as you. Pure.
import type { RevokeClass } from '@/server/actions/types';
import type { Tier } from './types';

export const revokeIntent = (cls: string, to: Tier, project = 'ledgerline', why = 'revoked from the Ladder'): RevokeClass => ({
  kind: 'revoke-class',
  project,
  changes: [{ class: cls, to }],
  why,
});
