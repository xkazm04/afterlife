import { loadDoorData } from '../features/door/data/loadDoorData';
import { DoorScreen } from '../features/door/DoorScreen';
import { stageFitSource } from '../features/door/model/fit';

// The front door: the whole fleet as a city at night, outside the app window. The inline script fits the stage before
// first paint, so it never paints at the wrong size.
export default function DoorPage() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: stageFitSource() }} />
      <DoorScreen data={loadDoorData()} />
    </>
  );
}
