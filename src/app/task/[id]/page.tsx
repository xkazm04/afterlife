import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TaskScreen } from '../../features/task/TaskScreen';
import { loadPageFacts } from '../../features/task/model/build/loadPage';
import { loadTasks } from '../../features/task/model/build/loadTasks';
import { selectionFromQuery, type SelectionQuery } from '../../features/task/model/verdict/reasons';
import { connection } from 'next/server';

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

type Params = { params: Promise<{ id: string }> };
type Props = Params & { searchParams: Promise<SelectionQuery> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  return { title: `Belay Task ${id}` };
}

// The task opens on ?check= / ?claim= when the task holds that id, else on its verdict's first deciding check.
export default async function TaskPage({ params, searchParams }: Props) {
  await connection(); // request time: the data source and its data are the running server's, never the build's
  const { id } = await params;
  const tasks = loadTasks();
  const task = tasks.find((t) => t.id === id);
  if (!task) notFound();
  return <TaskScreen tasks={tasks} task={task} page={loadPageFacts()} initial={selectionFromQuery(task, await searchParams)} />;
}
