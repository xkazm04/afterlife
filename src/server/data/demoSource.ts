// The demo data source: exactly what the screens read from src/lib/demo before B6. No index, no GitLab. The policy's
// rules are this checkout's policy/trust-policy.yml.
import * as demo from '@/lib/demo';
import { DEMO_NOW } from '@/lib/demo/clock';
import { foldStability } from '@/lib/stability/stability';
import { seedFleetDays } from '@/lib/trend/seed';
import { utcDay, type FleetDayRow } from '@/lib/trend/trend';
import { repoPolicy } from './policy';
import { DEMO_HUMAN_KEY } from './setup/humanKey';
import type { DataSource } from './types';

let seeded: FleetDayRow[] | null = null;

export const demoSource: DataSource = {
  mode: 'demo',
  illustrative: [],
  deepProjectId: () => demo.LEDGERLINE_ID,
  getFleet: demo.getFleet,
  getPortfolio: demo.getPortfolio,
  getStages: demo.getStages,
  getTiers: demo.getTiers,
  getTracks: demo.getTracks,
  getActionClasses: demo.getActionClasses,
  getMaturity: demo.getMaturity,
  getLoop: demo.getLoop,
  getTasks: demo.getTasks,
  getNeedsYou: demo.getNeedsYou,
  getNeedsYouCount: demo.getNeedsYouCount,
  getDecided: () => [],
  getSetup: demo.getSetup,
  getEvents: demo.getEvents,
  getCockpit: demo.getCockpit,
  getLedger: () => [],
  getPolicy: () => repoPolicy(),
  getTiersStale: () => null,
  getPollHealth: () => null,
  setupReads: () => null,
  humanKey: () => Promise.resolve(DEMO_HUMAN_KEY),
  getCycles: demo.getCycles,
  getEstateCycles: demo.getEstateCycles,
  // the demo's tasks are the deep project's; they name MRs but no sizes, pipelines or dates: those stay unknown
  getStability: () => ({
    [demo.LEDGERLINE_ID]: foldStability(demo.getTasks().filter((t) => t.mr !== null).map((t) => ({ size: null, pipeline: null, reverted: t.state === 'reverted' }))),
  }),
  // seeded, never measured: 28 days drifted from the demo fleet, ending on the demo's today (the screens say so)
  getFleetTrend: () => (seeded ??= seedFleetDays(demo.getFleet().projects, utcDay(DEMO_NOW))),
};
