// A disabled candidate names its reason to assistive tech: the checkbox points at the row's why span.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Candidate } from '../../model/design';
import { Designer } from './Designer';

const cand = (id: string, blocked: string | null): Candidate => ({
  id, stage: 'plan' as Candidate['stage'], from: 1, to: 2, title: `Change ${id}`, source: 'proposal', kind: 'mr', why: 'because', blocked,
});
const noop = () => undefined;
const html = () =>
  renderToStaticMarkup(
    createElement(Designer, {
      cycleId: 'C7', candidates: [cand('a', 'A stage is already lifting'), cand('b', null)], picked: [], problems: [], onToggle: noop, onSave: noop, onCancel: noop,
    }),
  );

describe('Designer blocked candidate', () => {
  it('links the checkbox to the reason span', () => {
    const out = html();
    const id = /aria-describedby="([^"]+)"/.exec(out)?.[1];
    expect(id).toBeTruthy();
    expect(out).toContain(`id="${id}"`);
    expect(out).toMatch(new RegExp(`id="${id}"[^>]*>A stage is already lifting<`));
  });
});
