import type { Metadata } from 'next';
import { loadFleetData } from '../features/fleet/data/loadFleetData';
import { FleetScreen } from '../features/fleet/FleetScreen';

export const metadata: Metadata = { title: 'Fleet' };

type Search = { searchParams: Promise<{ [key: string]: string | string[] | undefined }> };
const one = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);

// Fleet: the demo fleet is read on the server and drawn by one client screen. ?project=<id> opens with it selected.
export default async function FleetPage({ searchParams }: Search) {
  const data = loadFleetData();
  const want = one((await searchParams).project);
  const pick = want && data.projects.some((p) => p.id === want) ? want : undefined;
  // keyed by the pick, so following a second link to Fleet (same route) re-selects
  return <FleetScreen key={pick ?? ''} data={data} initialProject={pick} />;
}
