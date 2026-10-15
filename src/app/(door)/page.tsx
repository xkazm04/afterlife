import { loadDoorData } from '../features/door/data/loadDoorData';
import { DoorScreen } from '../features/door/DoorScreen';
import { entranceOf } from '../features/door/components/entrance/variants';

// The front door: the whole fleet as a city at night, outside the app window. The root layout's head fits the stage
// before first paint (DoorFitBoot), so it never paints at the wrong size. `?entrance=a|b|c|off` picks the entrance
// prototype that opens over it.
export default async function DoorPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const entrance = entranceOf((await searchParams).entrance);
  return <DoorScreen data={loadDoorData()} entrance={entrance} />;
}
