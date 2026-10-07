// The index may not know a value (null); the screens' types have no "unknown" for these fields. Where one has to be shown
// anyway, it is shown as the most restrictive reading, never as more trust than there is:
//   a class tier the index cannot give          -> its cell stays null, shown unknown (Ladder reads the cell); `tier`,
//                                                  which has no unknown, reads quarantined for code that only acts on it
//   a task tier the index cannot give           -> quarantined
//   a task whose class is unknown               -> not listed (it is not a Belay task yet)
//   a maturity scan that never ran              -> nine rungs, every one unknown (null: the screens already draw null as unknown)
import { RUNGS, STAGES } from '@/schemas/stages';
import type { ActionClass, DemoData, MaturityRung, Task } from '@/lib/demo/types';
import type { ActionClassView, MaturityView, TaskView } from '@/server/index/views';

/** The class as screens take it: the view's cell (a tier, a standing, or null: unknown) is what Ladder shows. */
export const actionClass = (v: ActionClassView): ActionClass => ({ ...v, tier: v.tier ?? 'quarantined' });

export function task(v: TaskView): Task | null {
  if (v.cls === null) return null;
  return { ...v, track: v.track ?? 'T?', cls: v.cls, tierAtTime: v.tierAtTime ?? 'quarantined' };
}

export function maturity(v: MaturityView | null): DemoData['maturity'] {
  const rungs = v?.rungs ?? STAGES.map((stage) => ({ stage, day0: null, now: null, next: null, evidence: 'not scanned yet' }));
  return {
    engine: v?.engine ?? 'not scanned',
    scannedAt: v?.scannedAt ?? '--:--',
    rungNames: v?.rungNames ?? [...RUNGS],
    // The widened view types say what is null; DemoData says number. The Maturity screen reads `!= null` throughout.
    rungs: rungs as unknown as MaturityRung[],
    proposals: v?.proposals ?? [],
  };
}
