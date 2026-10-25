import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ShellProvider, DEMO_SHELL } from '@/components/shell/ShellContext';
import { estateOf } from '@/lib/settings/demoEstate';
import { DemoEstateSection, estateNote } from './DemoEstateSection';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => undefined }) }));

const html = (estate?: ReturnType<typeof estateOf>) =>
  renderToStaticMarkup(
    <ShellProvider value={{ ...DEMO_SHELL, estate }}>
      <DemoEstateSection />
    </ShellProvider>,
  );
const checked = (h: string) => h.match(/aria-checked="true"[^>]*>([^<]*)</)?.[1] ?? h.match(/<button[^>]*aria-checked="true"[^>]*>.*?>([A-Za-z]+)</)?.[1];

describe('Settings > Data & connection: Show demo estate', () => {
  it('names Auto, On and Off and selects the saved setting', () => {
    const h = html(estateOf('off', 1));
    expect(h).toContain('Show demo estate');
    for (const w of ['Auto', 'On', 'Off']) expect(h).toContain(`>${w}<`);
    expect(checked(h)).toBe('Off');
  });
  it('says what the setting does with the projects saved', () => {
    expect(estateNote(estateOf('auto', 0))).toBe('Demo estate shown · 0 real projects saved');
    expect(estateNote(estateOf('auto', 1))).toBe('Demo estate hidden from the sidebar · 1 real project saved');
    expect(html(estateOf('auto', 1))).toContain('hidden from the sidebar');
  });
  it('before the shell read lands: the default, and no claim about projects', () => {
    const h = html(undefined);
    expect(checked(h)).toBe('Auto');
    expect(h).toContain('Reading the saved projects');
  });
});
