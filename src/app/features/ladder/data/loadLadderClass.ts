// What /ladder/[class] needs: the Ladder's own data, and the class asked for. Null when the ledger holds no such class.
// Beside it, the human key read now (loadHumanKey): the promotion rule's precondition shows whether GitLab holds it.
import { getDataSource } from '@/server/data';
import type { HumanKeyRead } from '@/lib/promotion/types';
import type { LadderScreenProps } from '../props';
import { loadLadderData } from './loadLadderData';

export function loadLadderClass(id: string): (LadderScreenProps & { id: string }) | null {
  const data = loadLadderData();
  return data.seed.classes.some((c) => c.id === id) ? { ...data, id } : null;
}

/** The human key on belay-policy's default branch, as the data source reads it for this load (demo: illustrative). */
export function loadHumanKey(): Promise<HumanKeyRead> {
  return getDataSource().humanKey();
}
