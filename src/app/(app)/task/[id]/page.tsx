import type { Metadata } from 'next';

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  return { title: `Belay Task ${id}` };
}

// The route exists for a hard load (and its title); it reads nothing. The screen host in the (app) layout draws the task
// (features/task/screen/host.tsx): the docket, the task, its ledger and the page's facts stream in over
// GET /api/screen/task%2F%5Bid%5D?id=<id>, and an id the docket does not hold answers notFound there.
export default function TaskPage() {
  return null;
}
