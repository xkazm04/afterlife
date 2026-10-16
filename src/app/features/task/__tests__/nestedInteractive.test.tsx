// A button's children are presentational: a link or button inside role=button (or <button>) is an axe nested-interactive
// violation and the inner control is unreachable to a screen reader. The court's cards must not nest one.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ToastProvider } from '@/components/overlays/toast/ToastProvider';
import { Court } from '../components/court/Court';
import { loadTasks } from '../model/build/loadTasks';

const VOID = new Set(['br', 'hr', 'img', 'input', 'meta', 'link', 'path', 'circle', 'line']);
const isInteractive = (tag: string, attrs: string) => tag === 'a' || tag === 'button' || tag === 'input' || /\brole="(?:button|link)"/.test(attrs);

/** Count interactive elements that sit inside another interactive element. */
function nestedInteractive(markup: string): number {
  const stack: boolean[] = [];
  let nested = 0;
  for (const m of markup.matchAll(/<(\/?)([a-z][a-z0-9]*)([^>]*?)(\/?)>/g)) {
    const [, close, tag = '', attrs = '', selfClose] = m;
    if (close) {
      stack.pop();
      continue;
    }
    const inter = isInteractive(tag, attrs);
    if (inter && stack.some(Boolean)) nested++;
    if (!VOID.has(tag) && !selfClose) stack.push(inter);
  }
  return nested;
}

const tasks = loadTasks();
const props = { sel: null, rv: null, onPick: () => undefined };

describe('nested interactive controls', () => {
  it('the scan counts a link inside role=button and a button inside a button', () => {
    expect(nestedInteractive('<div role="button"><span><a href="x">y</a></span></div>')).toBe(1);
    expect(nestedInteractive('<button><button>y</button></button><div role="button"></div><a href="x">z</a>')).toBe(1);
    expect(nestedInteractive('<div><button>a</button><a href="x">b</a></div>')).toBe(0);
  });

  it('no court on any task nests one', () => {
    const counts = tasks.map((task) => nestedInteractive(renderToStaticMarkup(createElement(ToastProvider, null, createElement(Court, { task, ...props })))));
    expect(counts.reduce((a, b) => a + b, 0)).toBe(0);
  });
});
