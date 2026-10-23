import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { demoSource } from '@/server/data/demoSource';
import { L2View } from '../../components/l2/L2View';
import type { Deep } from '../../components/l2/L2Panel';

vi.mock('next/link', () => ({ default: (p: { href: string; children?: unknown }) => createElement('a', { href: p.href }, p.children as never) }));

const fleet = demoSource.getFleet();
const p = fleet.projects.find((x) => x.state === 'watching')!;
const deep: Deep = { id: 'other', cockpit: { running: '', doingNow: '', goingWell: '', needsMe: '' }, needs: [], tracks: [], illustrative: { cockpit: false, tracks: false } };
const html = renderToStaticMarkup(createElement(L2View, { p, group: p.group, classes: fleet.classes, stages: ['a', 'b'], deep, from: { x: 0, y: 0, k0: 1 } }));
const rows = [...html.matchAll(/<div class="[^"]*_cl_[^"]*"[^>]*>/g)].map((m) => m[0]);

describe('the L2 class list reaches the window highlight from the keyboard', () => {
  it('lists every class row', () => {
    expect(rows.length).toBe(fleet.classes.length);
  });
  it('is one tab stop (roving), the rest reachable by arrows', () => {
    expect(rows.filter((r) => /tabindex="0"/.test(r)).length).toBe(1);
    expect(rows.filter((r) => /tabindex="-1"/.test(r)).length).toBe(rows.length - 1);
  });
  it('lights the window on focus and clears it on blur, as the decision list pairs pointer with focus', () => {
    const src = readFileSync(new URL('../../components/l2/L2View.tsx', import.meta.url), 'utf8');
    expect(src).toMatch(/onFocus=\{\(\) => \{\s*setHotClass\(i\)/);
    expect(src).toMatch(/onBlur=\{/);
    expect(src).toMatch(/ArrowDown/);
  });
});
