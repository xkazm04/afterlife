import { TaskNotFound } from '@/app/features/task/TaskNotFound';

/** An unknown /task/<id> (the screen host draws the same window when the stream answers notFound). */
export default function TaskNotFoundPage() {
  return <TaskNotFound />;
}
