// The live data source: the latest snapshot of the index, plus the demo's catalogue for what the index cannot serve yet.
// That narrative (tracks, the loop, the cockpit text, the setup phases) is declared in `illustrative`, so the screens
// label it. The tier meanings are the product's tier vocabulary, the same in every mode, not narrative. The stage list is
// the schema's. The recent events are the index's own (`getEvents`).
import { DEMO } from '@/lib/demo';
import type { DemoData } from '@/lib/demo/types';
import { STAGES } from '@/schemas/stages';
import type { DataSource, IllustrativePart } from '../types';
import type { LiveSnapshot } from './snapshot';

export const LIVE_ILLUSTRATIVE: readonly IllustrativePart[] = ['tracks', 'loop', 'cockpit', 'setup'];

/** `snapshot` throws when the first poll has not finished: a page must not show an empty fleet as if it were real. */
export function liveSource(snapshot: () => LiveSnapshot, catalogue: DemoData = DEMO): DataSource {
  const data = () => snapshot().data;
  return {
    mode: 'live',
    illustrative: LIVE_ILLUSTRATIVE,
    deepProjectId: () => snapshot().deep,
    getFleet: () => data().fleet,
    getPortfolio: () => data().portfolio,
    getStages: () => [...STAGES],
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
