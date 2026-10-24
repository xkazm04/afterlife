import { ScreenSkeleton } from '@/components/shell/loading/ScreenSkeleton';

// The desk's window, as NeedsYouScreen titles it, with table rows while the list (and the runner's decisions) stream in.
export default function Loading() {
  return <ScreenSkeleton title="Needs you" layout="table" />;
}
