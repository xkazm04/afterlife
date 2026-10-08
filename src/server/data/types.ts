// What the screens' server loaders read. The surface is the one `@/lib/demo` has always had (the getX accessors), so a
// loader changes one import and nothing else. Reads are synchronous: the live source serves a snapshot that the poller
// refreshes after every cycle, so a page never waits on GitLab or on the index.
import type { CycleHistory } from '@/lib/demo/cycleTypes';
import type { DemoData, Task } from '@/lib/demo/types';

export type DataMode = 'demo' | 'live';

export interface DataSource {
  readonly mode: DataMode;
  /** The project the deep screens (Ladder, Needs you, Task, Maturity) are about. */
  deepProjectId(): string;
  getFleet(): DemoData['fleet'];
  getPortfolio(): DemoData['portfolio'];
  getStages(): DemoData['stages'];
  getTiers(): DemoData['tiers'];
  getTracks(): DemoData['tracks'];
  getActionClasses(): DemoData['actionClasses'];
  getMaturity(): DemoData['maturity'];
  getLoop(): DemoData['loop'];
  getTasks(): readonly Task[];
  getNeedsYou(): DemoData['needsYou'];
  /** The number on the Needs you badge. */
  getNeedsYouCount(): number;
  getSetup(): DemoData['setup'];
  getEvents(): DemoData['events'];
  getCockpit(): DemoData['cockpit'];
  /** The deep project's closed cycles, as its ledger records them. */
  getCycles(): CycleHistory;
  /** Every project with a recorded cycle, by project id (the deep project included). */
  getEstateCycles(): Readonly<Record<string, CycleHistory>>;
}
