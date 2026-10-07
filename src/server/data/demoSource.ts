// The demo data source: exactly what the screens read from src/lib/demo before B6. No index, no GitLab. The policy's
// rules are this checkout's policy/trust-policy.yml.
import * as demo from '@/lib/demo';
import { repoPolicy } from './policy';
import type { DataSource } from './types';

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
  getSetup: demo.getSetup,
  getEvents: demo.getEvents,
  getCockpit: demo.getCockpit,
  getPolicy: () => repoPolicy(),
  setupReads: () => null,
};
