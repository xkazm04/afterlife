import { ScreenSkeleton } from '@/components/shell/loading/ScreenSkeleton';

// The task's window: the docket's sidebar comes with the screen; the pane's sections stand in while /task finds the first task.
export default function Loading() {
  return <ScreenSkeleton title="Task" layout="sections" />;
}
