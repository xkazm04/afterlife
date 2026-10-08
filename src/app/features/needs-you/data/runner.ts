import type { ClickCopy } from './types';

/** n5, "finish setup": the runner step. Belay opens the page and checks; it writes nothing. */
export const RUNNER: ClickCopy & { openedAt: string; step: string; url: string; command: string } = {
  openedAt: '12:22',
  step: '6 · Runner and billing',
  url: 'gitlab.com/acme-lab/ledgerline/-/settings/ci_cd#runners',
  command: 'npx belay doctor',
  does: ['Opens the GitLab runner page in your browser', 'Check again shows a simulated result in the demo: doctor is not run'],
  doesNot: ['write anything', 'enter or read billing: Belay cannot see it'],
};
