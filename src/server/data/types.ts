// What the screens' server loaders read. The surface is the one `@/lib/demo` has always had (the getX accessors), so a
// loader changes one import and nothing else. Reads are synchronous: the live source serves a snapshot that the poller
// refreshes after every cycle, so a page never waits on GitLab or on the index.
import type { DemoData, Task } from '@/lib/demo/types';
import type { SetupReads } from './setup/read';

export type DataMode = 'demo' | 'live';

/**
 * Narrative a source still serves from the demo's catalogue beside live data: tracks, the loop, the cockpit's text
 * (running, doing now, going well, needs me, webhooks, unattributed; its poll age is live) and the setup phases. On the
 * Ladder: `policy-history`, the belay-policy history it opens with (its ledger, the tier-state.yml head, the policy's
 * revision and merge age, and the commit ids they name: the poller reads belay-policy's files, never its history), and
 * `records`, the class records' counters (GitLab cannot restate them: the poller keeps what the index had, the seed's).
 */
export type IllustrativePart = 'tracks' | 'loop' | 'cockpit' | 'setup' | 'policy-history' | 'records';

/** trust-policy.yml's rules as a screen shows them. Policy numbers, not measurements. */
export interface PolicyRules {
  profile: string | null;
  cooldownDays: number;
  /** The lease on a hands-off grant, in days (grant_ttl_days); null: no lease. */
  leaseDays: number | null;
  /** assisted_to_supervised */
  toSupervised: { accepted: number; reverts: number };
  /** supervised_to_hands_off */
  toHandsOff: { accepted: number; noEditRatio: number; cleanDays: number };
  /** demotion.one_step_on and demotion.quarantine_on: the triggers. */
  oneStepOn: readonly string[];
  quarantineOn: readonly string[];
  envelope: { maxFiles: number; maxLines: number; environments: readonly string[] };
}

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
  /**
   * trust-policy.yml's rules. Demo: this checkout's policy/trust-policy.yml. Live: the one the last poll read from
   * belay-policy; null until a poll has read one the engine accepts.
   */
  getPolicy(): PolicyRules | null;
  /**
   * Setup's live reads (its tracks' arm blocks, the belay doctor, the steps a read can observe), bound to the port and
   * the snapshot's pairing row. The getter is synchronous; the reads are port calls the Setup loader awaits. Null in demo
   * mode, where Setup reads nothing.
   */
  setupReads(): SetupReads | null;
}
