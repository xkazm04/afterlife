// The live data source: the latest snapshot of the index, plus the demo's catalogue for what the index cannot serve yet
// (tracks, the loop, the tier meanings, the stage list). The recent events are the index's own (`getEvents`).
import { DEMO } from '@/lib/demo';
import type { DemoData } from '@/lib/demo/types';
import type { DataSource } from '../types';
import type { LiveSnapshot } from './snapshot';

/** `snapshot` throws when the first poll has not finished: a page must not show an empty fleet as if it were real. */
export function liveSource(snapshot: () => LiveSnapshot, catalogue: DemoData = DEMO): DataSource {
  const data = () => snapshot().data;
  return {
    mode: 'live',
    deepProjectId: () => snapshot().deep,
    getFleet: () => data().fleet,
    getPortfolio: () => data().portfolio,
    getStages: () => catalogue.stages,
    getTiers: () => catalogue.tiers,
    getTracks: () => catalogue.tracks,
    getActionClasses: () => data().actionClasses,
    getMaturity: () => data().maturity,
    getLoop: () => catalogue.loop,
    getTasks: () => data().tasks,
    getNeedsYou: () => data().needsYou,
    getNeedsYouCount: () => data().needsYou.length,
    getSetup: () => data().setup,
    getEvents: () => data().events,
    getCockpit: () => data().cockpit,
  };
}
