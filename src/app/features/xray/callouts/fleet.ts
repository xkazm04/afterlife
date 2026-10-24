// Fleet, the first screen the X-ray opens on: every project in one table.
import type { Callout } from '../model/types';
import { NAV, dataLabelCallout, helpCallout, projectsIn, statusCallout } from './shared';

const nums = (s: string): string[] => s.match(/\d+/g) ?? [];

export const FLEET: readonly Callout[] = [
  {
    id: 'nav',
    sel: NAV,
    title: 'The screens',
    body: (r) => {
      const badge = r.text(`${NAV} [role="img"]`);
      return `Every screen is one click here; you are on Fleet.${badge ? ` The amber ${badge} on Needs you is what waits for you now.` : ''}`;
    },
    try: 'Click Needs you',
  },
  {
    id: 'goto',
    sel: '[aria-label^="Go to anything"]',
    title: 'Go to anything',
    body: (r) => `Type a screen, an action or any of the ${projectsIn(r)} projects by name, and Enter goes there.`,
    try: 'Ctrl+K or ⌘K',
  },
  {
    id: 'columns',
    sel: '[role="radiogroup"][aria-label="Columns"]',
    title: 'What the columns count',
    body: () => 'Same rows, three column sets: Tiers (how far each project’s agents act alone), Classes, or the nine Stages.',
    try: 'Click Stages',
  },
  {
    id: 'counts',
    sel: '[aria-label="Fleet status"]',
    title: 'The fleet in four counts',
    body: (r) => {
      const [wait = '?', stale = '?', unwatched = '?', q = '?'] = nums(r.text('[aria-label="Fleet status"]'));
      return `${wait} decisions wait for you (amber is only ever that), ${stale} projects are stale, ${unwatched} not watched, ${q} classes quarantined.`;
    },
    try: 'Hover a count to name it',
  },
  {
    id: 'search',
    sel: '[aria-label="Search projects"]',
    title: 'Find one project',
    body: (r) => `Narrows the ${projectsIn(r)} rows as you type; Escape clears it and puts you back in the table.`,
    try: 'Press /',
  },
  {
    id: 'group',
    sel: '[role="treegrid"][aria-label="Projects"] [role="row"][aria-expanded]',
    title: 'A GitLab subgroup',
    body: (r) => {
      const [name = 'A group'] = r.text('[role="treegrid"][aria-label="Projects"] [role="row"][aria-expanded]').split(' ');
      return `${name}: rows are grouped as your GitLab groups are, with the group’s totals on its own row. The chevron folds it.`;
    },
    try: '↑ ↓ move · ← → fold and open',
  },
  {
    id: 'needs',
    sel: '[role="columnheader"][aria-label="Needs you"]',
    title: 'The amber column',
    body: () => 'Decisions waiting on each project. A click on the header sorts the fleet by it, most waiting first.',
    try: 'Click the ◆ header',
  },
  statusCallout('The whole table in one line', 'The left of the status bar always says how much is shown and how fresh it is.'),
  dataLabelCallout,
  helpCallout,
];
