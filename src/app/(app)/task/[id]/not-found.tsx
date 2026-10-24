import { EntityNotFound } from '@/components/shell/fallback/EntityNotFound';

/** An unknown /task/<id>: says it is the task that is missing (not a page) and links to the docket's first task. */
export default function TaskNotFound() {
  return (
    <EntityNotFound
      title="Task not found"
      note="No task with that id is held in the docket. It may have been removed or the link is mistyped."
      href="/task"
      back="Open the docket"
    />
  );
}
