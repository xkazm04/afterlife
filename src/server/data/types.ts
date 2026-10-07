// What the screens' server loaders read. The surface is the one `@/lib/demo` has always had (the getX accessors), so a
// loader changes one import and nothing else. Reads are synchronous: the live source serves a snapshot that the poller
// refreshes after every cycle, so a page never waits on GitLab or on the index.
import type { DemoData, Task } from '@/lib/demo/types';

export type DataMode = 'demo' | 'live';

/**
 * Narrative a source still serves from the demo's catalogue beside live data: tracks, the loop, the cockpit's text
 * (running, doing now, going well, needs me, webhooks, unattributed; its poll age is live) and the setup phases.
 */
export type IllustrativePart = 'tracks' | 'loop' | 'cockpit' | 'setup';

export interface DataSource {
  readonly mode: DataMode;
  /**
   * What this source serves as the demo's illustrative narrative beside live data, for the screens to label. Empty in
   * demo mode, where everything is the demo and the app says so once.
   */
  readonly illustrative: readonly IllustrativePart[];
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
}
