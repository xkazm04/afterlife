import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TaskScreen } from '@/app/features/task/TaskScreen';
import { loadPageFacts } from '@/app/features/task/model/build/loadPage';
import { loadTasks } from '@/app/features/task/model/build/loadTasks';
import { tabFromQuery, type TabQuery } from '@/app/features/task/model/tab';
import { selectionFromQuery, type SelectionQuery } from '@/app/features/task/model/verdict/reasons';
import { connection } from 'next/server';

type Params = { params: Promise<{ id: string }> };
type Props = Params & { searchParams: Promise<SelectionQuery & TabQuery> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  return { title: `Afterlife · Task · ${id}` };
}

// The task opens on ?check= / ?claim= when the task holds that id, else on its verdict's first deciding check; and on the
// ?tab= it names (chain, ledger), else the Court, read here so a reload draws the same tab with no flash.
export default async function TaskPage({ params, searchParams }: Props) {
  await connection(); // request time: the data source and its data are the running server's, never the build's
  const { id } = await params;
  const tasks = loadTasks();
  const task = tasks.find((t) => t.id === id);
  if (!task) notFound();
  const q = await searchParams;
  return <TaskScreen tasks={tasks} task={task} page={loadPageFacts()} initial={selectionFromQuery(task, q)} initialTab={tabFromQuery(q)} />;
}
