import { ScreenSkeleton } from '@/components/shell/loading/ScreenSkeleton';

// The wizard while "Your repos" is read (the first read starts a git per repo; then 60 s cached).
export default function Loading() {
  return <ScreenSkeleton title="Set up my first project" layout="sections" />;
}
