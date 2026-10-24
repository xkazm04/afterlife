import { ScreenSkeleton } from '@/components/shell/loading/ScreenSkeleton';

// A stage's detail page: section cards while the stage streams in, inside the crag's layout (its session stays mounted).
export default function Loading() {
  return <ScreenSkeleton title="Maturity" layout="sections" />;
}
