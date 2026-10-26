// The Task screens' slices for the screen stream (GET /api/screen/<key>, docs/features/screen-host.md):
//   task          docket - the redirect to the docket's first task (the page's own query carried: ?xray=1), or an empty
//                          docket the window says it holds;
//   task/[id]     docket - one light row per task (model/docket/row.ts): the sidebar, the filters, n across tasks;
//                 detail - the open task whole, minus its ledger (notFound for an id the docket does not hold);
//                 ledger - that task's ledger rows and how they were checked (the heaviest part, on a line of its own);
//                 page   - what the screen says of itself (live, subtitle, poll age).
// Every read is the data source's in-memory snapshot; no task page ships every task's ledger any more.
import { notFound, ok, redirectTo, type ModuleLoaders, type SliceCtx } from '@/app/features/screens/types';
import { loadPageFacts } from '../model/build/loadPage';
import { loadTasks } from '../model/build/loadTasks';
import { docketRow } from '../model/docket/row';
import type { TaskView } from '../model/types';

const taskOf = ({ params }: SliceCtx): TaskView | undefined => loadTasks().find((t) => t.id === params.id);

/** /task's answer: the first task, with the page's query (the X-ray's ?xray=1 lands on it with the X-ray on). */
export function firstTaskSlice(tasks: readonly Pick<TaskView, 'id'>[], search: URLSearchParams) {
  const first = tasks[0]?.id;
  if (!first) return ok([]);
  const q = search.toString();
  return redirectTo(`/task/${encodeURIComponent(first)}${q ? `?${q}` : ''}`);
}

export const loaders: ModuleLoaders = {
  task: {
    slices: { docket: ({ search }) => firstTaskSlice(loadTasks(), search) },
  },
  'task/[id]': {
    slices: {
      docket: () => ok(loadTasks().map(docketRow)),
      detail: (ctx) => {
        const t = taskOf(ctx);
        if (!t) return notFound();
        const detail: Partial<TaskView> = { ...t };
        delete detail.ledger;
        delete detail.ledgerCheck;
        return ok(detail);
      },
      ledger: (ctx) => {
        const t = taskOf(ctx);
        return t ? ok({ ledger: t.ledger, ledgerCheck: t.ledgerCheck }) : notFound();
      },
      page: () => ok(loadPageFacts()),
    },
  },
};
