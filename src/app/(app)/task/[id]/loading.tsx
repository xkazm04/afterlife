import { ScreenSkeleton } from '@/components/shell/loading/ScreenSkeleton';

// A task's page (verdict, receipt chain, court) as section cards while the docket and the task stream in.
export default function Loading() {
  return <ScreenSkeleton title="Task" layout="sections" />;
}
