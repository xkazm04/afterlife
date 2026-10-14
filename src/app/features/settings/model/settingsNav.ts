// The Settings sub-pages: pure data and one pure matcher for the sidebar's current item.

export interface SettingsPage {
  key: string;
  href: string;
  label: string;
}

export const SETTINGS_PAGES: readonly SettingsPage[] = [
  { key: 'display', href: '/settings/display', label: 'Display' },
  { key: 'keyboard', href: '/settings/keyboard', label: 'Keyboard' },
  { key: 'data', href: '/settings/data', label: 'Data & connection' },
  { key: 'about', href: '/settings/about', label: 'About' },
];

/** Which sub-page a pathname is on (a trailing slash or a deeper path still counts); null for anything else. */
export function activeSettingsKey(pathname: string): string | null {
  const hit = SETTINGS_PAGES.find((p) => pathname === p.href || pathname.startsWith(`${p.href}/`));
  return hit ? hit.key : null;
}
