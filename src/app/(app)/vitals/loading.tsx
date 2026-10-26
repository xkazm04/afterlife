import { ScreenSkeleton } from '@/components/shell/loading/ScreenSkeleton';

// The real projects' table while .afterlife/projects and each project's stored runs are read.
export default function Loading() {
  return <ScreenSkeleton title="Vitals" layout="table" />;
}
