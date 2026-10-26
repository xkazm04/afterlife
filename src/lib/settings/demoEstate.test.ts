import { describe, expect, it } from 'vitest';
import { APP_NAV } from '@/components/shell/sidebar/navItems';
import { demoBannerShown, demoEstateCookie, demoEstateFrom, enterHref, estateOf, expiredOldDemoEstateCookie, navShown, parseDemoEstate } from './demoEstate';

const shown = (setting: 'auto' | 'on' | 'off', real: number) => APP_NAV.filter((e) => navShown(e.key, estateOf(setting, real))).map((e) => e.key);

describe('demo estate', () => {
  it('parses the three values and falls back to auto', () => {
    expect(['auto', 'on', 'off', 'yes', undefined].map(parseDemoEstate)).toEqual(['auto', 'on', 'off', 'auto', 'auto']);
  });
  it('auto is on with no real project and off once one exists; on and off force it', () => {
    expect([estateOf('auto', 0).demo, estateOf('auto', 1).demo, estateOf('on', 3).demo, estateOf('off', 0).demo]).toEqual([true, false, true, false]);
  });
  it('off: the nav keeps the real tools (Vitals, Set up, Runs) and hides every demo screen', () => {
    expect(shown('auto', 1)).toEqual(['start', 'vitals', 'runs']);
    expect(shown('off', 0)).toEqual(['start', 'vitals', 'runs']);
  });
  it('on, or not read yet: every screen', () => {
    expect(shown('on', 2)).toEqual(APP_NAV.map((e) => e.key));
    expect(APP_NAV.every((e) => navShown(e.key, undefined))).toBe(true);
  });
  it('the banner: a demo screen with real projects beside it, or reached by URL with demo off; never a real tool', () => {
    expect(demoBannerShown('fleet', estateOf('on', 1))).toBe(true);
    expect(demoBannerShown('fleet', estateOf('off', 0))).toBe(true);
    expect(demoBannerShown('fleet', estateOf('auto', 0))).toBe(false);
    expect(demoBannerShown('vitals', estateOf('off', 1))).toBe(false);
    expect(demoBannerShown('runs', estateOf('on', 1))).toBe(false);
    expect(demoBannerShown('fleet', undefined)).toBe(false);
    expect(demoBannerShown(null, estateOf('off', 1))).toBe(false);
  });
  it('the door goes to Vitals when real projects exist', () => {
    expect([enterHref(0), enterHref(1)]).toEqual(['/fleet', '/vitals']);
  });
  it('the cookie is app-wide and long-lived', () => {
    expect(demoEstateCookie('off')).toBe('afterlife.demoEstate=off; path=/; max-age=31536000; samesite=lax');
  });
  it('a switch saved before the rename still reads, the new name wins, and the switch expires the old cookie', () => {
    const jar = (c: Record<string, string>) => (name: string) => c[name];
    expect(demoEstateFrom(jar({ 'belay.demoEstate': 'off' }))).toBe('off');
    expect(demoEstateFrom(jar({ 'belay.demoEstate': 'off', 'afterlife.demoEstate': 'on' }))).toBe('on');
    expect(demoEstateFrom(jar({}))).toBeUndefined();
    expect(expiredOldDemoEstateCookie()).toBe('belay.demoEstate=; path=/; max-age=0; samesite=lax');
  });
});
