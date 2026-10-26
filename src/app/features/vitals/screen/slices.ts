// Vitals' slices for the screen stream (GET /api/screen/<key>, docs/features/screen-host.md). Both keys read this
// machine's files (.belay/projects and the collected jsonl), so they answer only a request addressed to this machine
// (`local`); a refused one fails every slice with 'not-local' and the screen says so.
//   vitals            config      - the saved projects from their configs (cheap: one yaml each), the first line;
//                     runs        - per project, the stored CI runs' count and newest fetch (the ci-runs jsonl), and
//                                   the server's clock they are aged from.
//   vitals/[project]  config      - the project (notFound for a slug no saved project has) and the server's clock;
//                     job         - this server's collect job for it (in memory);
//                     ci          - Delivery (the variants), runs stored, last collected (the ci-runs jsonl);
//                     prod        - Production (the signals with deploys marked), omitted with no cloud;
//                     adjustments - each claim beside Afterlife's measurements.
import { notFound, ok, type ModuleLoaders, type SliceResult } from '@/app/features/screens/types';
import type { ProjectConfig } from '@/schemas/vitals';
import { jobOf } from '../data/jobs';
import { loadAdjustments, loadCi, loadProd, loadVitalsConfig, loadVitalsRuns, projectConfig } from '../data/loadVitals';
import { configView } from '../model/view';

/** A slice of one project: notFound when no saved project has the slug. */
const of = (read: (cfg: ProjectConfig) => unknown) => ({ params }: { params: Readonly<Record<string, string>> }): SliceResult => {
  const cfg = projectConfig(params.project ?? '');
  return cfg ? ok(read(cfg)) : notFound();
};

export const loaders: ModuleLoaders = {
  vitals: {
    local: true,
    slices: {
      config: () => ok({ projects: loadVitalsConfig() }),
      runs: () => ok({ now: new Date().toISOString(), bySlug: loadVitalsRuns() }),
    },
  },
  'vitals/[project]': {
    local: true,
    slices: {
      config: of((cfg) => ({ ...configView(cfg), now: new Date().toISOString() })),
      job: of((cfg) => {
        const job = jobOf(cfg.slug);
        return job ? { job } : {};
      }),
      ci: of(loadCi),
      prod: of((cfg) => loadProd(cfg, new Date().toISOString())),
      adjustments: of((cfg) => ({ adjustments: loadAdjustments(cfg) })),
    },
  },
};
