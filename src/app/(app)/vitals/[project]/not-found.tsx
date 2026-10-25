import { EntityNotFound } from '@/components/shell/fallback/EntityNotFound';

/** An unknown /vitals/<project>: no saved project has that slug; links back to the list of real projects. */
export default function VitalsProjectNotFound() {
  return (
    <EntityNotFound
      title="Project not found"
      note="No onboarded project has that slug. Onboard it first, or pick one from the list."
      href="/vitals"
      back="Back to Vitals"
    />
  );
}
