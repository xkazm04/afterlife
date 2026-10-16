// Focus leaving the city clears the hover; moving focus tower to tower does not flicker through "nothing".
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HOME } from '../model/camera';

vi.mock('react', async (orig) => ({ ...(await orig<typeof import('react')>()), useRef: <T,>(v: T) => ({ current: v }) }));
const { Scene } = await import('../components/scene/Scene');

type H = (e: unknown) => void;
const frames: (() => void)[] = [];
beforeEach(() => {
  frames.length = 0;
  vi.stubGlobal('requestAnimationFrame', (f: () => void) => frames.push(f));
});
afterEach(() => vi.unstubAllGlobals());

/** A focus/blur event whose target is a tower (data-p) in district layer 3, or a control outside the city. */
const on = (id: string | null) => ({
  target: {
    closest: (sel: string) =>
      id == null ? null : sel.includes('data-p') ? { getAttribute: (k: string) => (k === 'data-p' ? id : null), closest: () => ({ getAttribute: () => '3' }) } : { getAttribute: () => '3' },
  },
});

function mount() {
  const seen: [number | null, string | null][] = [];
  const el = Scene({ ds: [], classes: [], level: 1, curG: 3, hotG: null, hotTower: null, dim: null, red: null, cam: HOME, camMs: 0, onHover: (gi, id) => seen.push([gi, id]), onPick: () => undefined }) as ReactElement<Record<string, H>>;
  const flush = () => frames.splice(0).forEach((f) => f());
  return { p: el.props, seen, flush };
}

describe('Scene focus handling', () => {
  it('has a blur handler beside the focus one', () => {
    expect(typeof mount().p.onBlur).toBe('function');
  });
  it('focus on a tower hovers it; blur out of the city clears it', () => {
    const { p, seen, flush } = mount();
    p.onFocus!(on('t1'));
    flush();
    expect(seen.at(-1)).toEqual([3, 't1']);
    p.onBlur!(on('t1'));
    flush();
    expect(seen.at(-1)).toEqual([null, null]);
  });
  it('blur then focus on the next tower in one frame ends on the next tower', () => {
    const { p, seen, flush } = mount();
    p.onFocus!(on('t1'));
    flush();
    p.onBlur!(on('t1'));
    p.onFocus!(on('t2'));
    flush();
    expect(seen.at(-1)).toEqual([3, 't2']);
  });
});
