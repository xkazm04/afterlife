// The R0-R4 labels carry the rung meanings as SVG <title> tooltips (MAT_META.rungMeans has no other reader). A tooltip
// needs the pointer, and the `inert` group sets pointer-events: none, so a <title> inside it can never show.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RUNGS } from '@/schemas/stages';
import { cragGeom } from '../../model/crag/geometry';
import { Backdrop } from './Backdrop';

/** The <title> elements that sit inside a `<g class="...inert...">`, by walking the group nesting. */
function titlesUnderInert(html: string): number {
  let depth = 0;
  const inertAt: number[] = [];
  let n = 0;
  for (const m of html.matchAll(/<g\b([^>]*)>|<\/g>|<title>/g)) {
    if (m[0] === '</g>') {
      if (inertAt[inertAt.length - 1] === depth) inertAt.pop();
      depth--;
    } else if (m[0] === '<title>') {
      if (inertAt.length) n++;
    } else {
      depth++;
      if (/class="[^"]*inert/.test(m[1] ?? '')) inertAt.push(depth);
    }
  }
  return n;
}

const html = renderToStaticMarkup(createElement('svg', null, createElement(Backdrop, { g: cragGeom(800, 400, 1), hatchId: 'h', rungNames: RUNGS })));

describe('Backdrop rung tooltips', () => {
  it('draws one <title> per rung', () => {
    expect((html.match(/<title>/g) ?? []).length).toBe(RUNGS.length);
  });
  it('none of them sits under pointer-events: none', () => {
    expect(titlesUnderInert(html)).toBe(0);
  });
});
