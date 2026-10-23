// Closing the Screens menu with Escape hands focus back to the toggle; an outside click does not.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const focus = vi.fn();
const setOpen = vi.fn();
vi.mock('react', async (orig) => ({
  ...(await orig<typeof import('react')>()),
  useState: () => [true, setOpen],
  useRef: () => ({ current: { focus, contains: () => false } }),
  useEffect: (f: () => void) => f(),
}));
vi.mock('next/image', () => ({ default: () => null }));
vi.mock('next/link', () => ({ default: () => null }));
const { TopChrome } = await import('../components/chrome/Chrome');

type L = (e: unknown) => void;
const handlers: Record<string, L> = {};
class Key {
  constructor(readonly key: string) {}
  preventDefault() {}
}
beforeEach(() => {
  focus.mockClear();
  setOpen.mockClear();
  vi.stubGlobal('KeyboardEvent', Key);
  vi.stubGlobal('window', { addEventListener: (t: string, f: L) => (handlers[t] = f), removeEventListener: () => undefined });
  (TopChrome as unknown as { type: (p: object) => unknown }).type({ org: 'o', asOf: 'now' });
});
afterEach(() => vi.unstubAllGlobals());

describe('Screens menu focus', () => {
  it('Escape closes the menu and focuses the toggle', () => {
    handlers.keydown!(new Key('Escape'));
    expect(setOpen).toHaveBeenCalledWith(false);
    expect(focus).toHaveBeenCalledTimes(1);
  });
  it('another key neither closes nor moves focus', () => {
    handlers.keydown!(new Key('Tab'));
    expect(setOpen).not.toHaveBeenCalled();
    expect(focus).not.toHaveBeenCalled();
  });
  it('an outside click closes the menu and leaves focus where the click put it', () => {
    handlers.pointerdown!({ target: {} });
    expect(setOpen).toHaveBeenCalledWith(false);
    expect(focus).not.toHaveBeenCalled();
  });
});

describe('Screens menu, focus leaving it', () => {
  type Blur = (e: { currentTarget: { contains: (n: unknown) => boolean }; relatedTarget: unknown }) => void;
  const corner = () => {
    const tree = (TopChrome as unknown as { type: (p: object) => { props: { children: { props: { onBlur?: Blur } }[] } } }).type({ org: 'o', asOf: 'now' });
    return tree.props.children[1]!.props.onBlur;
  };
  const inside = {};
  const box = { contains: (n: unknown) => n === inside };
  it('Tab past the last screen closes the menu', () => {
    corner()!({ currentTarget: box, relatedTarget: {} });
    expect(setOpen).toHaveBeenCalledWith(false);
  });
  it('moving within the menu, or out of the window, keeps it open', () => {
    corner()!({ currentTarget: box, relatedTarget: inside });
    corner()!({ currentTarget: box, relatedTarget: null });
    expect(setOpen).not.toHaveBeenCalled();
  });
});
