// Pieces shared by the migration modules.
import { STAGES } from '@/schemas/stages';

export interface Migration {
  version: number;
  name: string;
  sql: string;
}

const list = (xs: readonly string[]): string => `(${xs.map((x) => `'${x}'`).join(', ')})`;

export const CEILINGS = list(['quarantined', 'assisted', 'supervised', 'hands_off', 'human_only']);
export const TIERS = list(['quarantined', 'assisted', 'supervised', 'hands_off']);
export const STAGE_LIST = list(STAGES);
