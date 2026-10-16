// aria-label on a div or span with no role is ignored by assistive tech: the name has to sit on an element that has one.
import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ToastProvider } from '@/components/overlays/toast/ToastProvider';
import { ReceiptChain } from '../components/chain/ReceiptChain';
import { Court } from '../components/court/Court';
import { VerdictEquation } from '../components/equation/VerdictEquation';
import { loadTasks } from '../model/build/loadTasks';

const task = loadTasks().find((t) => t.proof.checks.some((c) => !c.ok)) ?? loadTasks()[0]!;
const props = { sel: null, rv: null, onPick: () => undefined, onSelect: () => undefined };
const html = (node: ReactElement) => renderToStaticMarkup(createElement(ToastProvider, null, node));

/** Every div/span that carries an aria-label but no role. */
const nameless = (markup: string): string[] => (markup.match(/<(?:div|span)\b[^>]*>/g) ?? []).filter((tag) => /\baria-label=/.test(tag) && !/\brole=/.test(tag));

describe('aria-label sits on an element with a role', () => {
  it('the court columns, the receipt chain placeholder and the equation tally', () => {
    const rendered = [
      html(createElement(Court, { task, ...props })),
      html(createElement(ReceiptChain, { task: { ...task, chain: [] }, lit: -1 })),
      html(createElement(VerdictEquation, { task: { ...task, proof: { ...task.proof, checks: task.proof.checks.map((c, i) => ({ ...c, ok: i === 0 ? null : c.ok })) } }, ...props })),
      html(createElement(VerdictEquation, { task, ...props })),
    ].join('');
    expect(nameless(rendered)).toEqual([]);
  });

  it('the scan sees a bare label', () => {
    expect(nameless('<div aria-label="x"></div><span role="img" aria-label="y"></span>')).toEqual(['<div aria-label="x">']);
  });
});
