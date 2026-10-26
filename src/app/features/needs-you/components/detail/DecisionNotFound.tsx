import { EntityNotFound } from '@/components/shell/fallback/EntityNotFound';

/** An unknown /needs-you/<item>: it is the decision that is missing, with the way back to the desk. */
export function DecisionNotFound() {
  return (
    <EntityNotFound
      title="Decision not found"
      note="No decision with that id waits on your desk. It may have been decided, or the link is mistyped."
      href="/needs-you"
      back="Back to Needs you"
    />
  );
}
