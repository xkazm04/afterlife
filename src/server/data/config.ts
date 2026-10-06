// Which data the app serves. Env only.
//   BELAY_MODE    demo (default) | live. Anything else (the hosted replay's `replay` included) serves the demo data.
//   BELAY_GITLAB  glab (default, the operator's own login) | fake (a seeded fake GitLab: live mode without a real group).
//   BELAY_PROJECT the project the deep screens are about (default: the demo's ledgerline).
import { LEDGERLINE_ID } from '@/lib/demo';
import type { DataMode } from './types';

export type GitLabKind = 'glab' | 'fake';

export interface DataConfig {
  mode: DataMode;
  gitlab: GitLabKind;
  deepProject: string;
}

export function readDataConfig(env: Record<string, string | undefined> = process.env): DataConfig {
  return {
    mode: env.BELAY_MODE === 'live' ? 'live' : 'demo',
    gitlab: env.BELAY_GITLAB === 'fake' ? 'fake' : 'glab',
    deepProject: env.BELAY_PROJECT || LEDGERLINE_ID,
  };
}
