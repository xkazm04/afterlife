import { redirect } from 'next/navigation';
import { firstTaskId } from '../features/task/model/build/loadTasks';

/** /task has no content of its own: the sidebar link opens the data source's first task, which the docket always draws. */
export default function TaskIndexPage() {
  const first = firstTaskId();
  redirect(first ? `/task/${encodeURIComponent(first)}` : '/');
}
