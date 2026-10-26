import { readdirSync } from 'node:fs';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { SETTINGS_PAGES } from '@/app/features/settings/model/settingsNav';

const redirect = vi.fn();
vi.mock('next/navigation', () => ({ redirect: (to: string) => redirect(to), usePathname: () => '/settings/display' }));
vi.mock('next/server', () => ({ connection: async () => undefined }));

// Ground truth is the route folders on disk, not SETTINGS_PAGES: the sidebar list, the folders and the tab titles agree.
describe('the Settings routes', () => {
  it('has one route folder per SETTINGS_PAGES entry, and no other', () => {
    const dirs = readdirSync(__dirname, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
    expect(dirs.sort()).toEqual(SETTINGS_PAGES.map((p) => p.key).sort());
  });
  it('/settings redirects to the first sub-page', async () => {
    const { default: SettingsPage } = await import('./page');
    // The page is a <Suspense> around the redirect (it waits for a request); run the child it wraps.
    const child = (SettingsPage() as { props: { children: { type: () => Promise<never> } } }).props.children;
    await child.type();
    expect(redirect).toHaveBeenCalledWith(SETTINGS_PAGES[0]?.href);
  });
  // The first import pulls in the whole Window shell (seconds under a parallel run), so it is done once, up front.
  const titles = new Map<string, unknown>();
  beforeAll(async () => {
    for (const p of SETTINGS_PAGES) titles.set(p.key, ((await import(`./${p.key}/page.tsx`)) as { metadata?: { title?: unknown } }).metadata?.title);
  });
  it.each(SETTINGS_PAGES.map((p) => [p.key, p.label] as const))('/settings/%s names its tab after its sidebar label', (key, label) => {
    expect(titles.get(key)).toBe(`Afterlife · Settings · ${label}`);
  });
});
