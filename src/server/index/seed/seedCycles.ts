// A history (days since onboarding) written as the cycle file would record it: each cycle opened and closed by a rescan
// at the demo's scan clock, counted back from the anchor's day. The fake GitLab serves the deep project's history this
// way; the rest of the estate in cycles has no GitLab project, so the seed writes theirs (like the other 183 projects).
import { DEMO, ESTATE_CYCLES } from '@/lib/demo';
import type { CycleHistory } from '@/lib/demo/cycleTypes';
import { appendCycle, type CycleRecord } from '@/schemas/cycle';
import { replaceCycleRecords } from '../repositories/ledger/cycles';
import type { Queryable } from '../repositories/sql';

const DAY = 86_400_000;
/** GitLab ids the seeded estate projects' records name. Illustrative: these projects are not in the demo GitLab. */
export const ESTATE_GID_BASE = 90020000;

export function historyRecords(h: CycleHistory, gitlabProjectId: number, anchor: Date): CycleRecord[] {
  const [hh = 0, mm = 0] = DEMO.maturity.scannedAt.split(':').map(Number);
  const scan = new Date(anchor);
  scan.setUTCHours(hh, mm, 0, 0);
  const dayAt = (d: number): string => new Date(scan.getTime() - (h.today - d) * DAY).toISOString();
  const chain: CycleRecord[] = [];
  for (const c of h.cycles) {
    chain.push(appendCycle(chain, {
      project_id: gitlabProjectId, theme: c.theme, engine: c.engine, opened_at: dayAt(c.openedDay), closed_at: dayAt(c.closedDay ?? h.today),
      changes: c.changes.map((x) => ({
        mr_iid: x.mr === null ? null : Number(x.mr.slice(1)), kind: x.kind, stage: x.stage, from: x.from, to: x.to, title: x.title,
        verdict: x.verdict as CycleRecord['changes'][number]['verdict'], why: x.why, ...(x.lines === undefined ? {} : { lines: x.lines }),
      })),
    }));
  }
  return chain;
}

/** Seeds the estate projects' cycle records. The deep project's come from its ledger, by the poll. */
export async function seedCycles(db: Queryable, now: Date): Promise<void> {
  const ids = Object.keys(ESTATE_CYCLES);
  for (const [i, id] of ids.entries()) {
    const h = ESTATE_CYCLES[id];
    if (h) await replaceCycleRecords(db, id, historyRecords(h, ESTATE_GID_BASE + i + 1, now));
  }
}
