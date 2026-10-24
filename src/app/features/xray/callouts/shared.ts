// Parts every windowed screen has: the shell tags them (data-xray), so the X-ray finds them on any screen.
import { numberIn } from '../model/dom';
import type { Callout, ScreenRead } from '../model/types';

export const STATUS = '[data-xray="status"]';
export const DATA_LABEL = '[data-xray="data-label"]';
// The status bar's ?, not another HelpButton drawn earlier in the page (Task's verdict equation has its own).
export const HELP = '[data-xray="status"] ~ [data-xray="help"]';
export const NAV = 'nav[aria-label="Afterlife"]';

/** The status bar's own line, as the screen wrote it. */
export const statusLine = (r: ScreenRead): string => r.text(STATUS) || 'the status line';

/** The fleet's size as the shell knows it: the palette and the fleet's status line both say it. */
export const projectsIn = (r: ScreenRead): string => numberIn(r.text(STATUS), 'every');

export const statusCallout = (title: string, after: string): Callout => ({
  id: 'status',
  kind: 'shell',
  sel: STATUS,
  title,
  body: (r) => `"${statusLine(r)}". ${after}`,
});

export const dataLabelCallout: Callout = {
  id: 'data',
  kind: 'shell',
  sel: DATA_LABEL,
  title: 'Where the data comes from',
  body: (r) =>
    r.text(DATA_LABEL) === 'illustrative demo data'
      ? 'Illustrative demo data: acme-lab is a made-up estate, so nothing you click here reaches a real GitLab.'
      : `"${r.text(DATA_LABEL)}": every screen says which data it shows, here, on the right of the status bar.`,
};

export const helpCallout: Callout = {
  id: 'help',
  kind: 'shell',
  sel: HELP,
  title: 'Legend and keys',
  body: () => 'Every screen keeps its legend and its keys behind this ?. Pinned open, it also turns this X-ray back on.',
  try: 'Click ?',
};

/** The sidebar, on any screen: the way to every other screen, with what waits on Needs you. */
export const navCallout = (here: string): Callout => ({
  id: 'nav',
  kind: 'shell',
  sel: NAV,
  title: 'The screens',
  body: (r) => {
    const badge = r.text(`${NAV} [role="img"]`);
    return `Every screen is one click here; you are on ${here}.${badge ? ` The amber ${badge} on Needs you is what waits for you now.` : ''}`;
  },
});
