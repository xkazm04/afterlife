import { firstParam } from '@/lib/url/searchParams';
import { loadDoorData } from '../features/door/data/loadDoorData';
import { DoorScreen } from '../features/door/DoorScreen';
import { Motion } from '@/components/shell/frame/Motion';
import { connection } from 'next/server';

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

// The front door: the whole fleet as a city at night, outside the app window, behind the treasure gates of its
// entrance (`?entrance=off` goes straight to the city). The root layout's head fits the stage before first paint
// (DoorFitBoot), so it never paints at the wrong size.
export default async function DoorPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  await connection(); // request time: the data source and its data are the running server's, never the build's
  const entrance = firstParam((await searchParams).entrance) !== 'off';
  // Leaving for a screen, the city fades and swells away as the window arrives (styles/transitions.css: door-exit).
  return (
    <Motion exit="door-exit">
      <DoorScreen data={loadDoorData()} entrance={entrance} />
    </Motion>
  );
}
