import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { TaskEmpty } from '@/app/features/task/TaskEmpty';
import { firstTaskId } from '@/app/features/task/model/build/loadTasks';
import { connection } from 'next/server';

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = { title: 'Belay Task' };

/** /task has no content of its own: the sidebar link opens the data source's first task, which the docket always draws. With none, the window says so. */
export default async function TaskIndexPage() {
  await connection(); // request time: the data source and its data are the running server's, never the build's
  const first = firstTaskId();
  if (first) redirect(`/task/${encodeURIComponent(first)}`);
  return <TaskEmpty />;
}
