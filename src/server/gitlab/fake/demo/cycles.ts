// belay-ledger/cycles/<project-id>.jsonl for the demo group: the deep project's closed cycles (src/lib/demo/cycles.ts)
// as the autopilot would record them, a week apart at the demo's scan clock. Built with the schema's own appendCycle,
// so it verifies; read back, it is the same history (parity.test.ts).
import { DEMO_CYCLES } from '@/lib/demo';
import type { CycleRecord } from '@/schemas/cycle';
import { historyRecords } from '@/server/index/seed/seedCycles';
import { LEDGERLINE_GID } from './ids';

export const cycleRecords = (anchor: Date): CycleRecord[] => historyRecords(DEMO_CYCLES, LEDGERLINE_GID, anchor);

export const cyclesJsonl = (anchor: Date): string => cycleRecords(anchor).map((r) => JSON.stringify(r)).join('\n') + '\n';
