import { createElement, type ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { SliceFixture, type ScreenKey } from '@/components/shell/host';
import { SETTINGS_PAGES } from '../model/settingsNav';
import { screens } from './host';

vi.mock('next/navigation', () => ({ usePathname: () => '/settings/data', useRouter: () => ({ push: () => undefined, refresh: () => undefined }) }));
vi.mock('next/link', () => ({ default: (p: { href: string; children?: ReactNode }) => createElement('a', { href: p.href }, p.children) }));

const render = (key: ScreenKey, slices: Record<string, unknown> = {}) => {
  const Frame = screens.find((d) => d.key === key)?.Frame ?? (() => null);
  return renderToString(
    <SliceFixture slices={slices}>
      <Frame params={{}} search={new URLSearchParams()} />
    </SliceFixture>,
  ).replace(/<!-- -->/g, '');
};

describe('Settings on the screen host', () => {
  it('claims every sub-page; only Data & connection reads a slice', () => {
    expect(screens.map((d) => [d.key, d.ready, d.slices])).toEqual([
      ['settings/display', true, []],
      ['settings/data', true, ['connection']],
      ['settings/keyboard', true, []],
      ['settings/about', true, []],
    ]);
  });

  it.each(SETTINGS_PAGES.map((p) => [p.key, p.label] as const))('settings/%s names its tab after its sidebar label', (key, label) => {
    expect(screens.find((d) => d.key === `settings/${key}`)?.title({}, new URLSearchParams())).toBe(`Belay Settings ${label}`);
  });

  it('a static sub-page paints whole at once', () => {
    expect(render('settings/keyboard')).toContain('Per screen');
    expect(render('settings/display')).toContain('How large the text and controls are');
  });

  it('Data & connection unread: the Connection card with a dash in each row; read: the values', () => {
    const unread = render('settings/data');
    expect(unread).toContain('mode not read yet');
    expect(unread).not.toContain('demo (the default)');
    const read = render('settings/data', { connection: { mode: 'demo (the default)', gitlab: 'not used in demo', host: 'none', groupId: 'none' } });
    expect(read).toContain('demo (the default)');
  });
});
