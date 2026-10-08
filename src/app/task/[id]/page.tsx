import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TaskScreen } from '../../features/task/TaskScreen';
import { loadTasks } from '../../features/task/model/build/loadTasks';

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  return { title: `Task ${id}` };
}

export default async function TaskPage({ params }: Params) {
  const { id } = await params;
  const tasks = loadTasks();
  const task = tasks.find((t) => t.id === id);
  if (!task) notFound();
  return <TaskScreen tasks={tasks} task={task} />;
}
