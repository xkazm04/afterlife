import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getDataSource } from '@/server/data';

export const metadata: Metadata = { title: 'Task' };

/** /task has no content of its own: the sidebar link opens the first task. */
export default function TaskIndexPage() {
  const first = getDataSource().getTasks()[0];
  redirect(first ? `/task/${first.id}` : '/');
}
