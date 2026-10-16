// A Stepper step's accessible name is its text content. The tick/digit badge is decoration, and a past step must say
// "done" in text, not only by colour. Probe: count past steps whose markup carries the done word and a hidden badge.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Stepper, type StepperStep } from '../toolbar/Stepper';

const step = (k: number, name: string, past: boolean, current = false): StepperStep<number> => ({
  k, name, title: name, enabled: true, current, past, count: null, loud: false,
});
const STEPS = [step(1, 'Pick', true), step(2, 'Preview', true), step(3, 'Send', false, true), step(4, 'After merge', false)];
const html = renderToStaticMarkup(createElement(Stepper<number>, { steps: STEPS, onGo: () => {}, label: 'Steps' }));
const buttons = html.match(/<button[\s\S]*?<\/button>/g) ?? [];

describe('Stepper accessible names', () => {
  it('hides the tick/digit badge from assistive tech on every step', () => {
    expect(buttons).toHaveLength(4);
    for (const b of buttons) expect(b).toMatch(/<i class="[^"]*" aria-hidden="true">/);
  });

  it('exposes a done state as text on past steps only', () => {
    const done = buttons.filter((b) => />\s*done\s*</i.test(b) || /\(done\)/i.test(b));
    expect(done).toHaveLength(2);
    expect(buttons[0]).toMatch(/done/i);
    expect(buttons[1]).toMatch(/done/i);
    expect(buttons[2]).not.toMatch(/done/i);
    expect(buttons[3]).not.toMatch(/done/i);
  });
});
