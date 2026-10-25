import { firstParam } from '@/lib/url/searchParams';
import { loadDoorData } from '../features/door/data/loadDoorData';
import { DoorScreen } from '../features/door/DoorScreen';
import { Motion } from '@/components/shell/frame/Motion';
import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import { liveGate } from '../features/trace/data/facts';
import { loadProjects } from '@/server/discover';
import { enterHref } from '@/lib/settings/demoEstate';

// The front door: the whole fleet as a city at night, outside the app window, behind the treasure gates of its
// entrance (`?entrance=off` goes straight to the city). The root layout's head fits the stage before first paint
// (DoorFitBoot), so it never paints at the wrong size. Enter Afterlife goes to Vitals once a real project is saved.
export default async function DoorPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  await connection(); // request time: the data source and its data are the running server's, never the build's
  if (liveGate().gate) redirect('/trace'); // live with nothing to draw yet: the setup wire, not an error page
  const entrance = firstParam((await searchParams).entrance) !== 'off';
  // Leaving for a screen, the city fades and swells away as the window arrives (styles/transitions.css: door-exit).
  return (
    <Motion exit="door-exit">
      <DoorScreen data={loadDoorData()} entrance={entrance} enter={enterHref(loadProjects().length)} />
    </Motion>
  );
}
