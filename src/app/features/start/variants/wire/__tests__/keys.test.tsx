// The wire's keyboard on the small fake DOM (no jsdom; events are not dispatched, so the test calls React's own
// onKeyDown props): → moves focus without selecting, Enter selects and opens, Esc closes and returns focus to the node.
import { describe, expect, it, vi } from 'vitest';
import { FakeElement, installFakeDom } from '@/components/shell/frame/fakeDom';
import { VIEWS } from '../../../model/fixtures/views';
import type { StepKey } from '../../../model/types';

vi.mock('next/link', () => ({ default: () => null }));
vi.mock('../../../components/StepBody', () => ({ StepBody: ({ step }: { step: { key: string } }) => `body:${step.key}` }));

const { document, container } = installFakeDom();
Object.assign(FakeElement.prototype, {
  focus(this: FakeElement) {
    (document as { activeElement: FakeElement | null }).activeElement = this;
  },
});
const { act, createElement, useState } = await import('react');
const { createRoot } = await import('react-dom/client');
const { WireVariant } = await import('../WireVariant');

const select = vi.fn();
function Harness() {
  const [selected, setSelected] = useState<StepKey>(VIEWS.done.selected);
  return createElement(WireVariant, { view: { ...VIEWS.done, selected, select: (k: StepKey) => (select(k), setSelected(k)) } });
}

const els = () => (container as unknown as FakeElement).all();
const byRole = (r: string) => els().filter((e) => e.getAttribute('role') === r);
const tab = (k: string) => byRole('tab').find((e) => e.getAttribute('data-step') === k)!;
type Props = { onKeyDown: (e: { key: string; preventDefault: () => void; stopPropagation: () => void }) => void };
const props = (el: FakeElement) => (el as unknown as Record<string, Props>)[Object.keys(el).find((k) => k.startsWith('__reactProps$'))!]!;
const press = (el: FakeElement, key: string) => act(() => props(el).onKeyDown({ key, preventDefault() {}, stopPropagation() {} }));

describe('Wire keyboard', () => {
  it('arrows rove, Enter opens, Esc closes and hands focus back', async () => {
    const root = createRoot(container as unknown as HTMLElement);
    await act(async () => root.render(createElement(Harness)));
    const list = byRole('tablist')[0]!;
    const panel = () => byRole('tabpanel')[0]!;
    expect(tab('unlock').getAttribute('tabindex')).toBe('0');
    expect(panel().hasAttribute('hidden')).toBe(false);

    await press(list, 'Home');
    expect(document.activeElement).toBe(tab('repo'));
    expect(tab('repo').getAttribute('tabindex')).toBe('0');
    expect(tab('unlock').getAttribute('tabindex')).toBe('-1');
    await press(list, 'ArrowRight');
    expect(document.activeElement).toBe(tab('glab'));
    expect(select).not.toHaveBeenCalled();

    await press(list, 'Enter');
    expect(select).toHaveBeenCalledWith('glab');
    expect(tab('glab').getAttribute('aria-selected')).toBe('true');
    expect(panel().getAttribute('aria-labelledby')).toBe(tab('glab').getAttribute('id'));
    expect(panel().textContent).toContain('body:glab');

    await press(panel(), 'Escape');
    expect(panel().hasAttribute('hidden')).toBe(true);
    expect(tab('glab').getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(tab('glab'));

    await press(list, 'End');
    await press(list, 'Enter');
    expect(tab('unlock').getAttribute('aria-expanded')).toBe('true');
    expect(panel().hasAttribute('hidden')).toBe(false);
    await act(async () => root.unmount());
  });
});
