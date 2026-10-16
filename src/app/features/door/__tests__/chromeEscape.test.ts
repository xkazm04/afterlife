// Escape with the Screens menu open is claimed by the menu it closes.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { claimEscape } from '../components/chrome/Chrome';

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

describe('Escape with the menu open', () => {
  const press = (key: string) => {
    const e = { key, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
    return { e, closed: claimEscape(e) };
  };
  it('closes the menu and prevents the default, so the door does not also go up a level', () => {
    const { e, closed } = press('Escape');
    expect(closed).toBe(true);
    expect(e.defaultPrevented).toBe(true);
  });
  it('leaves every other key alone', () => {
    const { e, closed } = press('Tab');
    expect(closed).toBe(false);
    expect(e.defaultPrevented).toBe(false);
  });
  it('is the claim useDoor honours: its Escape step skips a prevented key', () => {
    expect(strip(readFileSync(new URL('../hooks/useDoor.ts', import.meta.url), 'utf8'))).toMatch(/key === 'Escape' && !e\.defaultPrevented/);
  });
});
