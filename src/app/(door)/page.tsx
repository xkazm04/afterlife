import { loadDoorData } from '../features/door/data/loadDoorData';
import { DoorScreen } from '../features/door/DoorScreen';

// The front door: the whole fleet as a city at night, outside the app window. The root layout's head fits the stage
// before first paint (DoorFitBoot), so it never paints at the wrong size.
export default function DoorPage() {
  return <DoorScreen data={loadDoorData()} />;
}
