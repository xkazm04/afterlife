// What the views return: the demo shapes screens consume today (src/lib/demo/types.ts), widened only where the
// index can genuinely not know a value. Those fields are null, never a made-up default.
import type {
  ActionClass, DemoData, FleetProject, MaturityRung, NeedsYouItem, Task, TierKey,
} from '@/lib/demo/types';

export type { FleetProject, NeedsYouItem };

export interface FleetView {
  classes: string[];
  groups: string[];
  projects: FleetProject[];
}

export type ActionClassView = Omit<ActionClass, 'tier'> & { tier: TierKey | null };

export type MaturityRungView = Omit<MaturityRung, 'day0' | 'now' | 'next'> & {
  day0: number | null;
  now: number | null;
  next: number | null;
};

export type MaturityView = Omit<DemoData['maturity'], 'rungs'> & { rungs: MaturityRungView[] };

export type TaskView = Omit<Task, 'track' | 'cls' | 'tierAtTime'> & {
  track: string | null;
  cls: string | null;
  tierAtTime: TierKey | null;
};
