// The orbit by keyboard, mounted on the small fake DOM (no jsdom): an arrow moves focus to the next node clockwise,
// Enter grows its card (the orbit goes inert, the heading takes focus), Esc folds it back and the node has focus again.
import { describe, expect, it, vi } from 'vitest';
import { FakeElement, installFakeDom } from '@/components/shell/frame/fakeDom';
import { VIEWS } from '../../../model/fixtures/views';

vi.mock('next/link', () => ({ default: () => null }));

const { document, container } = installFakeDom();
Object.assign(FakeElement.prototype, {
  focus(this: FakeElement) {
    document.activeElement = this;
  },
});
const { act, createElement } = await import('react');
const { createRoot } = await import('react-dom/client');
const { ConstellationVariant } = await import('../ConstellationVariant');

type Handlers = Record<string, ((e: unknown) => void) | undefined>;
const props = (el: FakeElement): Handlers => (el as unknown as Record<string, Handlers>)[Object.keys(el).find((k) => k.startsWith('__reactProps$'))!]!;
const all = () => container.all();
const node = (key: string) => all().find((e) => e.getAttribute('data-key') === key)!;
const dialog = () => all().find((e) => e.getAttribute('role') === 'dialog');
const key = (k: string) => ({ key: k, preventDefault() {}, stopPropagation() {} });

describe('Constellation by keyboard', () => {
  it('arrow moves, Enter opens, Esc folds back and returns focus to the node', async () => {
    const select = vi.fn();
    const root = createRoot(container as unknown as HTMLElement);
    await act(async () => root.render(createElement(ConstellationVariant, { view: { ...VIEWS.nothing, select } })));
    expect(node('repo').getAttribute('tabindex')).toBe('0');
    expect(node('glab').getAttribute('tabindex')).toBe('-1');

    await act(async () => props(node('repo')).onKeyDown?.(key('ArrowRight')));
    expect(document.activeElement).toBe(node('glab'));
    expect(node('glab').getAttribute('tabindex')).toBe('0');
    await act(async () => props(node('glab')).onKeyDown?.(key('ArrowLeft')));
    await act(async () => props(node('repo')).onKeyDown?.(key('ArrowLeft')));
    expect(document.activeElement).toBe(node('unlock'));
    await act(async () => props(node('unlock')).onKeyDown?.(key('Home')));
    await act(async () => props(node('repo')).onKeyDown?.(key('ArrowDown')));
    expect(document.activeElement).toBe(node('glab'));

    await act(async () => props(node('glab')).onKeyDown?.(key('Enter')));
    expect(select).toHaveBeenCalledWith('glab');
    const box = dialog()!;
    expect(box).toBeDefined();
    expect(node('glab').getAttribute('aria-expanded')).toBe('true');
    expect(all().some((e) => e.hasAttribute('inert'))).toBe(true);
    expect(document.activeElement?.tagName).toBe('h2');

    await act(async () => props(box).onKeyDown?.(key('Escape')));
    expect(box.getAttribute('data-closing')).toBe('true');
    await act(async () => props(box).onAnimationEnd?.({ target: box }));
    expect(dialog()).toBeUndefined();
    expect(all().some((e) => e.hasAttribute('inert'))).toBe(false);
    expect(document.activeElement).toBe(node('glab'));
    await act(async () => root.unmount());
  });
});
