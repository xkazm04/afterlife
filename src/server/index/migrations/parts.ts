// Pieces shared by the migration modules. Frozen lists: migrate() keys an applied migration on the sha256 of its sql, so
// these are written out and never read from src/schemas (a new stage or tier is a new migration; __tests__/migrations.test.ts
// fails while the lists and the schema disagree).

export interface Migration {
  version: number;
  name: string;
  sql: string;
}

const list = (xs: readonly string[]): string => `(${xs.map((x) => `'${x}'`).join(', ')})`;

export const CEILINGS = list(['quarantined', 'assisted', 'supervised', 'hands_off', 'human_only']);
export const TIERS = list(['quarantined', 'assisted', 'supervised', 'hands_off']);
export const STAGE_LIST = list(['plan', 'create', 'verify', 'package', 'secure', 'release', 'configure', 'monitor', 'govern']);
