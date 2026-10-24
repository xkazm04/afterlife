import { EntityNotFound } from '@/components/shell/fallback/EntityNotFound';

/** An unknown /maturity/<stage>: says it is the stage that is missing (not a page) and links back to the crag. */
export default function MaturityStageNotFound() {
  return (
    <EntityNotFound
      title="Stage not found"
      note="The crag has no stage with that name. The nine stages are the DevSecOps stages the scan reads."
      href="/maturity"
      back="Back to Maturity"
    />
  );
}
