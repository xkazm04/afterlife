import { EntityNotFound } from '@/components/shell/fallback/EntityNotFound';

/** An unknown /setup/<node>: says it is the step, track or capability that is missing and links back to the map. */
export function SetupNodeNotFound() {
  return (
    <EntityNotFound
      title="Setup node not found"
      note="The unlock map holds no step, track or capability by that name. The link may be mistyped."
      href="/setup"
      back="Open the unlock map"
    />
  );
}
