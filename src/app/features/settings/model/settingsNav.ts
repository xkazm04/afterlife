// The Settings sub-pages: pure data and one pure matcher for the sidebar's current item.

export interface SettingsPage {
  key: string;
  href: string;
  label: string;
  /** The window's status line: where this page's values live, so it never contradicts the page's content. */
  status: string;
}

export const SETTINGS_PAGES: readonly SettingsPage[] = [
  { key: 'display', href: '/settings/display', label: 'Display', status: 'Settings are saved in this browser' },
  { key: 'keyboard', href: '/settings/keyboard', label: 'Keyboard', status: 'Read only: nothing on this page is saved' },
  { key: 'data', href: '/settings/data', label: 'Data & connection', status: "Read from the server's environment" },
  { key: 'about', href: '/settings/about', label: 'About', status: 'Read only: nothing on this page is saved' },
];

/** Where /settings goes: the first sub-page (a client constant; the page replaces the URL with it, no read). */
export const SETTINGS_FRONT: string = SETTINGS_PAGES[0]?.href ?? '/settings/display';

/** Which sub-page a pathname is on (a trailing slash or a deeper path still counts); null for anything else. */
export function activeSettingsKey(pathname: string): string | null {
  const hit = SETTINGS_PAGES.find((p) => pathname === p.href || pathname.startsWith(`${p.href}/`));
  return hit ? hit.key : null;
}

/** The status line for a sub-page key; Display's wording for any other route (the pages are the only callers). */
export function settingsStatus(key: string | null): string {
  return (SETTINGS_PAGES.find((p) => p.key === key) ?? SETTINGS_PAGES[0])?.status ?? '';
}
