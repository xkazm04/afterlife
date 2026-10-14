// What /ladder/[class] needs: the Ladder's own data, and the class asked for. Null when the ledger holds no such class.
import type { LadderScreenProps } from '../props';
import { loadLadderData } from './loadLadderData';

export function loadLadderClass(id: string): (LadderScreenProps & { id: string }) | null {
  const data = loadLadderData();
  return data.seed.classes.some((c) => c.id === id) ? { ...data, id } : null;
}
