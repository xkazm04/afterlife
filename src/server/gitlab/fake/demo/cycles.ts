// belay-ledger/cycles/<project-id>.jsonl for the demo group: the demo's closed cycles (src/lib/demo/cycles.ts) as the
// autopilot would record them, each opened and closed by a rescan at the demo's scan clock (14:02), a week apart.
// Built with the schema's own appendCycle, so it verifies; read back, it is the same history (parity.test.ts).
import { DEMO, DEMO_CYCLES } from '@/lib/demo';
import { appendCycle, type CycleRecord } from '@/schemas/cycle';
import { DAY, LEDGERLINE_GID } from './ids';

/** The instant of day `d` of the history: today's scan clock, (today - d) days back from the anchor. */
function dayAt(anchor: Date, d: number): string {
  const [h = 0, m = 0] = DEMO.maturity.scannedAt.split(':').map(Number);
  const t = new Date(anchor);
  t.setUTCHours(h, m, 0, 0);
  return new Date(t.getTime() - (DEMO_CYCLES.today - d) * DAY).toISOString();
}

export function cycleRecords(anchor: Date): CycleRecord[] {
  const chain: CycleRecord[] = [];
  for (const c of DEMO_CYCLES.cycles) {
    chain.push(appendCycle(chain, {
      project_id: LEDGERLINE_GID, theme: c.theme, engine: c.engine,
      opened_at: dayAt(anchor, c.openedDay), closed_at: dayAt(anchor, c.closedDay ?? DEMO_CYCLES.today),
      changes: c.changes.map((x) => ({
        mr_iid: x.mr === null ? null : Number(x.mr.slice(1)), kind: x.kind, stage: x.stage, from: x.from, to: x.to,
        title: x.title, verdict: x.verdict as CycleRecord['changes'][number]['verdict'], why: x.why,
        ...(x.lines === undefined ? {} : { lines: x.lines }),
      })),
    }));
  }
  return chain;
}

export const cyclesJsonl = (anchor: Date): string => cycleRecords(anchor).map((r) => JSON.stringify(r)).join('\n') + '\n';
