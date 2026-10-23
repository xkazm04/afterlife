// The demo's seeded trend: 28 days ending on the demo's today, derived from the demo fleet with a small, deterministic
// drift per project (what waits wanders by one, some stale projects went stale days ago, some hands-off classes were
// promoted days back). Illustrative only: every screen labels it seeded. Pure.
import type { FleetProject } from '@/lib/demo/types';
import { dayRowsOf } from './rows';
import { addDays, TREND_DAYS, type FleetDayRow } from './trend';

/** A small stable hash of a project id, so the same fleet always seeds the same days. */
function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h;
}

/** `days` seeded rows per project, oldest first, the last day exactly the fleet as given. */
export function seedFleetDays(projects: readonly FleetProject[], today: string, days: number = TREND_DAYS): FleetDayRow[] {
  const base = dayRowsOf(today, projects);
  const out: FleetDayRow[] = [];
  for (let back = days - 1; back >= 0; back--) {
    const day = addDays(today, -back);
    base.forEach((b, i) => {
      const h = hash(b.projectId);
      if (back === 0) {
        out.push({ ...b, day });
        return;
      }
      // a quarter of the projects wander by one a day; a fifth had fewer waiting weeks back
      const wobble = h % 4 === 0 ? (((h >>> 4) + back) % 3) - 1 : 0;
      const drift = h % 5 === 0 ? Math.floor(back / 9) : 0;
      // a sixth were promoted to one more hands-off class some days back
      const promoted = h % 6 === 0 && back > (h % 20) + 3;
      out.push({
        ...b,
        day,
        // an unwatched project's decisions are counted nowhere, on any day
        needs: projects[i]!.state === 'not-set-up' ? 0 : Math.max(0, b.needs - drift + wobble),
        // half the stale projects went stale within the last fortnight
        stale: b.stale && (h % 2 === 0 || back <= (h % 10) + 2),
        handsOff: b.handsOff === null ? null : Math.max(0, b.handsOff - (promoted ? 1 : 0)),
      });
    });
  }
  return out;
}
