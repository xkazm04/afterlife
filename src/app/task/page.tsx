import { redirect } from 'next/navigation';
import { getDataSource } from '@/server/data';

/** /task has no content of its own: the sidebar link opens the first task. */
export default function TaskIndexPage() {
  const first = getDataSource().getTasks()[0];
  redirect(first ? `/task/${first.id}` : '/');
}
