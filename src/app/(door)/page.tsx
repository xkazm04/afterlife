import { firstParam } from '@/lib/url/searchParams';
import { loadDoorData } from '../features/door/data/loadDoorData';
import { DoorScreen } from '../features/door/DoorScreen';

// The front door: the whole fleet as a city at night, outside the app window, behind the treasure gates of its
// entrance (`?entrance=off` goes straight to the city). The root layout's head fits the stage before first paint
// (DoorFitBoot), so it never paints at the wrong size.
export default async function DoorPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const entrance = firstParam((await searchParams).entrance) !== 'off';
  return <DoorScreen data={loadDoorData()} entrance={entrance} />;
}
