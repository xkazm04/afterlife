import type { ClickCopy } from './types';

/** n5, "finish setup": the runner step. Afterlife opens the page and checks; it writes nothing. */
export const RUNNER: ClickCopy & { openedAt: string; checkedAgo: string; step: string; url: string; command: string } = {
  openedAt: '12:22',
  /** How stale the seeded last check is (the page was opened at openedAt, two hours before the demo clock): the row and the page quote it. */
  checkedAgo: '2 h ago',
  step: '6 · Runner and billing',
  url: 'gitlab.com/acme-lab/ledgerline/-/settings/ci_cd#runners',
  command: 'npx afterlife doctor',
  does: ['Opens the GitLab runner page in your browser', 'Check again shows a simulated result in the demo: doctor is not run'],
  doesNot: ['write anything', 'enter or read billing: Afterlife cannot see it'],
};
