import { ScreenSkeleton } from '@/components/shell/loading/ScreenSkeleton';

// A decision's page: section cards while it streams in, inside the desk's layout (its store stays mounted).
export default function Loading() {
  return <ScreenSkeleton title="Needs you" layout="sections" />;
}
