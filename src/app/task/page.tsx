import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { TaskEmpty } from '../features/task/TaskEmpty';
import { firstTaskId } from '../features/task/model/build/loadTasks';

export const metadata: Metadata = { title: 'Belay Task' };

/** /task has no content of its own: the sidebar link opens the data source's first task, which the docket always draws. With none, the window says so. */
export default function TaskIndexPage() {
  const first = firstTaskId();
  if (first) redirect(`/task/${encodeURIComponent(first)}`);
  return <TaskEmpty />;
}
