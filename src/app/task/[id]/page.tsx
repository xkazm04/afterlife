import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TaskScreen } from '../../features/task/TaskScreen';
import { loadPageFacts } from '../../features/task/model/build/loadPage';
import { loadTasks } from '../../features/task/model/build/loadTasks';
import { selectionFromQuery, type SelectionQuery } from '../../features/task/model/verdict/reasons';

type Params = { params: Promise<{ id: string }> };
type Props = Params & { searchParams: Promise<SelectionQuery> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  return { title: `Belay Task ${id}` };
}

// The task opens on ?check= / ?claim= when the task holds that id, else on its verdict's first deciding check.
export default async function TaskPage({ params, searchParams }: Props) {
  const { id } = await params;
  const tasks = loadTasks();
  const task = tasks.find((t) => t.id === id);
  if (!task) notFound();
  return <TaskScreen tasks={tasks} task={task} page={loadPageFacts()} initial={selectionFromQuery(task, await searchParams)} />;
}
