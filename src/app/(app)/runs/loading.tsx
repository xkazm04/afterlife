import { ScreenSkeleton } from '@/components/shell/loading/ScreenSkeleton';

// The waves table while the runner's .afterlife files are read.
export default function Loading() {
  return <ScreenSkeleton title="Runs" layout="table" />;
}
