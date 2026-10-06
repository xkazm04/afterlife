import { redirect } from 'next/navigation';
import { getTasks } from '@/lib/demo';

/** /task has no content of its own: the sidebar link opens the first task. */
export default function TaskIndexPage() {
  const first = getTasks()[0];
  redirect(first ? `/task/${first.id}` : '/');
}
