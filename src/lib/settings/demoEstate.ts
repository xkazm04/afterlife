// Real first, the demo estate as a setting. 'auto' (the default) shows the invented estate only while no real project
// is onboarded; 'on' and 'off' force it. Kept in a cookie, not localStorage, because the server decides the nav and the
// door's way in. Pure helpers, no DOM and no request: the server read is shell/live/estateRead.ts.

export const DEMO_ESTATES = ['auto', 'on', 'off'] as const;
export type DemoEstate = (typeof DEMO_ESTATES)[number];

export const DEFAULT_DEMO_ESTATE: DemoEstate = 'auto';
export const DEMO_ESTATE_COOKIE = 'belay.demoEstate';
const YEAR_SEC = 365 * 24 * 3600;

export const DEMO_ESTATE_LABEL: Record<DemoEstate, string> = { auto: 'Auto', on: 'On', off: 'Off' };

/** What the shell knows about the estate: the setting, how many real projects are saved, and whether demo shows. */
export interface Estate {
  setting: DemoEstate;
  real: number;
  demo: boolean;
}

/** The screens that run on the invented estate: hidden from the nav while it is off, bannered when real projects exist. */
export const DEMO_SCREENS: ReadonlySet<string> = new Set(['fleet', 'monitor', 'needs-you', 'ladder', 'maturity', 'cycles', 'task', 'setup', 'theater']);

/** Anything unknown, missing or corrupt is the default. */
export function parseDemoEstate(value: unknown): DemoEstate {
  return typeof value === 'string' && (DEMO_ESTATES as readonly string[]).includes(value) ? (value as DemoEstate) : DEFAULT_DEMO_ESTATE;
}

export function estateOf(setting: DemoEstate, real: number): Estate {
  return { setting, real, demo: setting === 'on' || (setting === 'auto' && real === 0) };
}

/** Whether a nav entry shows: every one while the demo estate is on (or the estate is not read yet), else the real tools. */
export function navShown(key: string, estate: Estate | undefined): boolean {
  return !estate || estate.demo || !DEMO_SCREENS.has(key);
}

/** A demo screen wears the "Demo data - illustrative" banner whenever a real number could sit beside it, or demo is off. */
export function demoBannerShown(key: string | null, estate: Estate | undefined): boolean {
  return !!key && !!estate && DEMO_SCREENS.has(key) && (estate.real > 0 || !estate.demo);
}

/** Where the front door's "Enter Afterlife" goes: the real projects when there are any, else the demo fleet. */
export const enterHref = (real: number): string => (real > 0 ? '/vitals' : '/fleet');

/** The Set-Cookie value the Settings switch writes from the browser (one year, the whole app). */
export function demoEstateCookie(setting: DemoEstate): string {
  return `${DEMO_ESTATE_COOKIE}=${setting}; path=/; max-age=${YEAR_SEC}; samesite=lax`;
}
