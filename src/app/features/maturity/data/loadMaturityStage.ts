// What /maturity/[stage] needs: the Maturity data, and the stage asked for. Null when the data source has no such stage.
import type { Stage } from '@/schemas';
import { getDataSource } from '@/server/data';

export function loadMaturityStage(key: string): Stage | null {
  return getDataSource().getStages().find((s) => s === key) ?? null;
}
