import { EntityNotFound } from '@/components/shell/fallback/EntityNotFound';

/** An unknown /fleet/<project>: says it is the project that is missing and links back to the fleet. */
export default function FleetProjectNotFound() {
  return (
    <EntityNotFound
      title="Project not found"
      note="No project with that id is in the fleet. It may have been removed or the link is mistyped."
      href="/fleet"
      back="Back to Fleet"
    />
  );
}
