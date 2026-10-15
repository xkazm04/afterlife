// The per-screen keys, as registered by each screen's useXKeys hook (src/app/features/<screen>/hooks). Plain data.

export interface ScreenKeys {
  screen: string;
  keys: readonly { keys: readonly string[]; does: string }[];
}

export const SCREEN_KEYS: readonly ScreenKeys[] = [
  {
    screen: 'Fleet',
    keys: [
      { keys: ['/'], does: 'Search' },
      { keys: ['Esc'], does: 'Clear search, close the popover, then the inspector' },
    ],
  },
  {
    screen: 'Needs you',
    keys: [
      { keys: ['/'], does: 'Search' },
      { keys: ['Esc'], does: 'Clear search, then close the inspector' },
    ],
  },
  {
    screen: 'Ladder',
    keys: [
      { keys: ['j', 'k'], does: 'Next / previous class' },
      { keys: ['/'], does: 'Search' },
      { keys: ['0', '1-5'], does: 'All tiers / filter to one tier' },
      { keys: ['p'], does: 'Promote' },
      { keys: ['r', 'q'], does: 'Revoke a step / quarantine' },
      { keys: ['?'], does: 'Legend' },
      { keys: ['Esc'], does: 'Clear search, then close the inspector' },
    ],
  },
  {
    screen: 'Maturity',
    keys: [
      { keys: ['←', '→', '↑', '↓'], does: 'Move between stages' },
      { keys: ['1-4'], does: 'Go to a step' },
      { keys: ['p'], does: 'Pick the selected gap' },
      { keys: ['d', 'n', 't'], does: 'Day 0 / now / target' },
      { keys: ['r'], does: 'Rescan all' },
      { keys: ['Enter'], does: 'Send, in the sheet' },
    ],
  },
  {
    screen: 'Theater',
    keys: [
      { keys: ['1-8'], does: 'Cue a take' },
      { keys: ['Space'], does: 'Play / pause' },
      { keys: ['r', 'l'], does: 'Roll / loop' },
      { keys: ['i', 'o'], does: 'Mark in / out' },
      { keys: ['←', '→', 'Home', 'End'], does: 'Step, jump to start / end' },
      { keys: ['f', 'Esc'], does: 'Present / leave' },
    ],
  },
  {
    screen: 'Task',
    keys: [
      { keys: ['↑', '↓'], does: 'Walk the court; in the docket, previous / next task' },
      { keys: ['←', '→'], does: 'Cross the court' },
      { keys: ['[', ']'], does: 'Previous / next task' },
      { keys: ['f'], does: 'Fail only' },
      { keys: ['r', 'w'], does: 'Replay / words' },
      { keys: ['Esc'], does: 'Clear the selection' },
    ],
  },
];
