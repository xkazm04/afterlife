import { Legend } from '@/components/overlays/popover/Legend';

/** The "?" legend: the funnel and the rule. */
export function OnboardLegend() {
  return (
    <Legend
      rows={[
        ['Discovered', 'Listed by the group API; nothing else is known'],
        ['Baselined', 'A read-only day-0 scan rated its nine stages'],
        ['Paired', 'Its bootstrap MR is merged; a stale feed stays here until the token is renewed'],
        ['Watching', 'Polled every cycle, feed live'],
        ['In cycles', 'An improvement cycle runs on it (see Cycles)'],
        ['Batch', 'Every read runs; writes are capped by the size; only a probe moves a project on'],
      ]}
    />
  );
}
