import { readdirSync } from 'node:fs';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { SETTINGS_FRONT, SETTINGS_PAGES } from '@/app/features/settings/model/settingsNav';

vi.mock('next/navigation', () => ({ usePathname: () => '/settings/display', useRouter: () => ({}) }));

// Ground truth is the route folders on disk, not SETTINGS_PAGES: the sidebar list, the folders and the tab titles agree.
describe('the Settings routes', () => {
  it('has one route folder per SETTINGS_PAGES entry, and no other', () => {
    const dirs = readdirSync(__dirname, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
    expect(dirs.sort()).toEqual(SETTINGS_PAGES.map((p) => p.key).sort());
  });
  it('/settings replaces itself with the first sub-page (a client constant: the page waits for no request)', async () => {
    const { default: SettingsPage } = await import('./page');
    const { ToSettingsFront } = await import('@/app/features/settings/screen/ToFront');
    expect((SettingsPage() as { type: unknown }).type).toBe(ToSettingsFront);
    expect(SETTINGS_FRONT).toBe(SETTINGS_PAGES[0]?.href);
  });
  // The first import pulls in the whole Window shell (seconds under a parallel run), so it is done once, up front.
  const titles = new Map<string, unknown>();
  beforeAll(async () => {
    for (const p of SETTINGS_PAGES) titles.set(p.key, ((await import(`./${p.key}/page.tsx`)) as { metadata?: { title?: unknown } }).metadata?.title);
  });
  it.each(SETTINGS_PAGES.map((p) => [p.key, p.label] as const))('/settings/%s names its tab after its sidebar label', (key, label) => {
    expect(titles.get(key)).toBe(`Belay Settings ${label}`);
  });
});
