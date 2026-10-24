import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { TaskEmpty } from '@/app/features/task/TaskEmpty';
import { firstTaskId } from '@/app/features/task/model/build/loadTasks';
import { connection } from 'next/server';

export const metadata: Metadata = { title: 'Belay Task' };

type Search = Record<string, string | string[] | undefined>;

/** The query, carried through the redirect (the X-ray's ?xray=1 link lands on the first task with the X-ray on). */
const queryOf = (sp: Search): string => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) for (const one of Array.isArray(v) ? v : v === undefined ? [] : [v]) q.append(k, one);
  const s = q.toString();
  return s ? `?${s}` : '';
};

/** /task has no content of its own: the sidebar link opens the data source's first task, which the docket always draws. With none, the window says so. */
export default async function TaskIndexPage({ searchParams }: { searchParams: Promise<Search> }) {
  await connection(); // request time: the data source and its data are the running server's, never the build's
  const first = firstTaskId();
  if (first) redirect(`/task/${encodeURIComponent(first)}${queryOf(await searchParams)}`);
  return <TaskEmpty />;
}
