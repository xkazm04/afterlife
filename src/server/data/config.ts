// Which data the app serves. The env (AFTERLIFE_<KEY>, read through envOf), with /start's runtime settings under it (serverEnv).
//   MODE    demo (default) | live. Anything else (the hosted replay's `replay` included) serves the demo data.
//   GITLAB  glab (default, the operator's own login) | fake (a seeded fake GitLab: live mode without a real group).
//   PROJECT the project the deep screens are about (default: the demo's ledgerline).
import { LEDGERLINE_ID } from '@/lib/demo';
import { envOf, serverEnv } from '@/server/env/env';
import type { DataMode } from './types';

export type GitLabKind = 'glab' | 'fake';

export interface DataConfig {
  mode: DataMode;
  gitlab: GitLabKind;
  deepProject: string;
}

export function readDataConfig(env: Record<string, string | undefined> = serverEnv()): DataConfig {
  return {
    mode: envOf(env, 'MODE') === 'live' ? 'live' : 'demo',
    gitlab: envOf(env, 'GITLAB') === 'fake' ? 'fake' : 'glab',
    deepProject: envOf(env, 'PROJECT') || LEDGERLINE_ID,
  };
}
