// The seeded ground (~2 ms to build) is built once a page load: not once by the ground and again by its pulses, and not
// again on every client-side return to the door.
import { createElement, Fragment } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const built = vi.hoisted(() => ({ n: 0 }));
vi.mock('../../model/ground', async (orig) => {
  const real = await orig<typeof import('../../model/ground')>();
  return { ...real, groundOf: (...a: Parameters<typeof real.groundOf>) => (built.n++, real.groundOf(...a)) };
});
const { Ground, Pulses } = await import('../../components/scene/Ground');

describe('the door ground', () => {
  it('is built once for the ground and its pulses, across two mounts', () => {
    const mount = () => renderToString(createElement(Fragment, null, createElement(Ground), createElement(Pulses)));
    const first = mount();
    const second = mount();
    expect(built.n).toBe(1);
    expect(second).toBe(first);
    expect(first.match(/data-ambient="city"/g)).toHaveLength(16); // eight pulses, two strokes each
  });
});
