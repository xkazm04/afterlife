import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Afterlife · Task' };

// The route exists for a hard load (and its title); it reads nothing. The screen host in the (app) layout draws /task
// (features/task/screen/host.tsx): its stream answers with a redirect to the docket's first task, the query carried
// (the X-ray's ?xray=1), or an empty docket the Task window says it holds.
export default function TaskIndexPage() {
  return null;
}
