import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { onEscape } from './escapeLayers';

// A Sheet holds the pane while the status bar's "?" popover and the toolbar menus stay reachable, so overlays stack.
const press = (root: EventTarget, key = 'Escape') => {
  const e = Object.assign(new Event('keydown', { cancelable: true }), { key });
  root.dispatchEvent(e);
  return e;
};

describe('Escape over stacked overlays', () => {
  it('the pattern it replaces: two capture listeners on one node both fire, stopPropagation cannot part them', () => {
    const root = new EventTarget();
    const closed: string[] = [];
    for (const who of ['sheet', 'popover'])
      root.addEventListener('keydown', (e) => (e.stopPropagation(), closed.push(who)), true);
    press(root);
    expect(closed).toEqual(['sheet', 'popover']);
  });

  it('closes only the layer opened last, then the one under it', () => {
    const root = new EventTarget();
    const closed: string[] = [];
    onEscape(() => closed.push('sheet'), root);
    const offPopover = onEscape(() => closed.push('popover'), root);
    expect(press(root).defaultPrevented).toBe(true);
    expect(closed).toEqual(['popover']);
    offPopover();
    press(root);
    expect(closed).toEqual(['popover', 'sheet']);
  });

  it('leaves other keys alone, and Escape too once every layer is gone', () => {
    const root = new EventTarget();
    const closed: string[] = [];
    const off = onEscape(() => closed.push('menu'), root);
    expect(press(root, 'Enter').defaultPrevented).toBe(false);
    off();
    expect(press(root).defaultPrevented).toBe(false);
    expect(closed).toEqual([]);
  });

  it('one close function registered twice is two layers: removing one keeps the other', () => {
    const root = new EventTarget();
    let n = 0;
    const close = () => n++;
    onEscape(close, root);
    const off = onEscape(close, root);
    off();
    off();
    press(root);
    expect(n).toBe(1);
  });
});

describe('every overlay that closes on Escape goes through the layers', () => {
  const strip = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const src = (p: string) => strip(readFileSync(new URL(p, import.meta.url), 'utf8'));
  it.each(['./Sheet.tsx', './popover/Popover.tsx', './menu/Menu.tsx'])('%s', (p) => {
    expect(src(p)).toContain('onEscape(');
    expect(src(p)).not.toMatch(/addEventListener\('keydown'|key === 'Escape'/);
  });
});

describe('no overlay binds its own Escape listener beside the layers', () => {
  // Derived from the folder, not from a list: a new overlay that adds its own keydown listener goes red here.
  const dir = new URL('./', import.meta.url);
  const files = readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .map((f) => f.replace(/\\/g, '/'))
    .filter((f) => /\.tsx?$/.test(f) && !/\.test\.|escapeLayers/.test(f));
  it('reads the folder', () => expect(files.length).toBeGreaterThan(5));
  it.each(files)('%s', (f) => {
    expect(readFileSync(new URL(f, dir), 'utf8')).not.toMatch(/addEventListener\('keydown'/);
  });
});
