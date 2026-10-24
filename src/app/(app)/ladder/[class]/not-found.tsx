import { EntityNotFound } from '@/components/shell/fallback/EntityNotFound';

/** An unknown /ladder/<class>: says it is the class that is missing (not a page) and links back to the Ladder. */
export default function LadderClassNotFound() {
  return (
    <EntityNotFound
      title="Class not found"
      note="No action class with that name is on the Ladder. It may have been removed or the link is mistyped."
      href="/ladder"
      back="Back to the Ladder"
    />
  );
}
