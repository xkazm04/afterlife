// Short labels the screens share. Plain data, no logic.
import type { ProjectState } from './types';

export const STATE_LABEL: Record<ProjectState, string> = {
  watching: 'Watching',
  'setting-up': 'Setting up',
  stale: 'Stale',
  'not-set-up': 'Not watched',
};

/** Column heads for the twelve action classes. */
export const CLASS_SHORT: Record<string, string> = {
  'dep-bump.patch': 'Dep',
  'code-fix.patch': 'Fix',
  'report.draft': 'Draft',
  'report.submit': 'Subm',
  'tier.demote': 'Dem',
  'tier.promote': 'Prom',
  'guard.block': 'Block',
  'pipeline.retry': 'Retry',
  'test.quarantine': 'Quar',
  'ci-config.change': 'CI',
  'qa.file-bug': 'Bug',
  'patch-bump': 'Bump',
};

/** Column heads for the nine stages. */
export const STAGE_SHORT: Record<string, string> = {
  plan: 'Plan',
  create: 'Create',
  verify: 'Verify',
  package: 'Pkg',
  secure: 'Secure',
  release: 'Release',
  configure: 'Config',
  monitor: 'Monitor',
  govern: 'Govern',
};
