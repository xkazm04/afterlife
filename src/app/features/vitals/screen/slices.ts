// Vitals' slices for the screen stream (GET /api/screen/<key>, docs/features/screen-host.md). Both keys read this
// machine's files (.afterlife/projects and the collected jsonl), so they answer only a request addressed to this machine
// (`local`); a refused one fails every slice with 'not-local' and the screen says so.
//   vitals            config      - the saved projects from their configs (cheap: one yaml each), the first line;
//                     runs        - per project, the stored CI runs' count and newest fetch (the ci-runs jsonl), and
//                                   the server's clock they are aged from.
//   vitals/[project]  config      - the project (notFound for a slug no saved project has) and the server's clock;
//                     job         - this server's collect job for it (in memory);
//                     ci          - Delivery (the variants), runs stored, last collected (the ci-runs jsonl);
//                     prod        - Production (the signals with deploys marked), omitted with no cloud;
//                     adjustments - each claim beside Afterlife's measurements.
// While the demo estate is on (the Settings cookie, read per request) both keys also show the demo projects
// (model/demo), marked `demo`, after the saved ones; theirs are generated, never read from disk.
import { notFound, ok, type ModuleLoaders, type SliceResult } from '@/app/features/screens/types';
import { readEstate } from '@/components/shell/live/estateRead';
import { jobOf } from '../data/jobs';
import { loadAdjustments, loadCi, loadConfig, loadProd, loadVitalsConfig, loadVitalsRuns, projectConfig, type Shown } from '../data/loadVitals';

/** Whether the demo estate shows: unreadable is off (only the saved projects, as before the demo estate). */
const demoOn = async (): Promise<boolean> => (await readEstate())?.demo ?? false;

/** A slice of one project: notFound when no shown project (saved, or demo while it is on) has the slug. */
const of = (read: (p: Shown) => unknown) => async ({ params }: { params: Readonly<Record<string, string>> }): Promise<SliceResult> => {
  const p = projectConfig(params.project ?? '', await demoOn());
  return p ? ok(read(p)) : notFound();
};

export const loaders: ModuleLoaders = {
  vitals: {
    local: true,
    slices: {
      config: async () => ok({ projects: loadVitalsConfig(await demoOn()) }),
      runs: async () => ok({ now: new Date().toISOString(), bySlug: loadVitalsRuns(await demoOn()) }),
    },
  },
  'vitals/[project]': {
    local: true,
    slices: {
      config: of((p) => ({ ...loadConfig(p), now: new Date().toISOString() })),
      job: of((p) => {
        const job = p.demo ? undefined : jobOf(p.cfg.slug);
        return job ? { job } : {};
      }),
      ci: of(loadCi),
      prod: of((p) => loadProd(p, new Date().toISOString())),
      adjustments: of((p) => ({ adjustments: loadAdjustments(p) })),
    },
  },
};
