// The L2 panel counts rungs from the stage list the cutaway draws, not from a literal nine.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { FleetProject } from '@/lib/demo/types';
import { L2Panel, type Deep } from '../components/l2/L2Panel';
import { waitWords } from '../model/words';

vi.mock('next/link', () => ({ default: (p: { href: string; children?: unknown }) => createElement('a', { href: p.href }, p.children as never) }));

const deep: Deep = { id: 'other', cockpit: { running: '', doingNow: '', goingWell: '', needsMe: '' }, needs: [], tracks: [], illustrative: { cockpit: false, tracks: false } };
const project = (known: number, total: number): FleetProject =>
  ({
    id: 'p1', name: 'P1', what: '', state: 'watching', armed: 2, tiers: {}, proofs7d: null, demotions7d: null, needsYou: 0, craOpen: 0,
    stages: Array.from({ length: total }, (_, i) => (i < known ? 1 : null)),
    feed: { ageSec: 5 }, group: 'g', classTiers: {},
  }) as unknown as FleetProject;

const text = (rungs: number, known: number) =>
  renderToStaticMarkup(createElement(L2Panel, { p: project(known, rungs), group: 'g', classes: [], deep, rungs })).replace(/<[^>]+>/g, '');

describe('L2 panel rung count', () => {
  it('follows a ten-stage list: "4 of 10 rungs known", "6 unknown"', () => {
    const t = text(10, 4);
    expect(t).toContain('4 of 10 rungs known');
    expect(t).toContain('6 unknown');
  });
  it('still reads nine for the nine-stage list', () => {
    const t = text(9, 4);
    expect(t).toContain('4 of 9 rungs known');
    expect(t).toContain('5 unknown');
  });
});

describe('L2 panel cockpit count', () => {
  it('says "1 decision" for the deep project with one waiting, not "1 decisions"', () => {
    const one: Deep = { ...deep, id: 'p1', needs: [{ id: 'n1', title: 'T', does: 'd', kind: 'merge' } as unknown as Deep['needs'][number]] };
    const t = renderToStaticMarkup(createElement(L2Panel, { p: project(4, 9), group: 'g', classes: [], deep: one, rungs: 9 })).replace(/<[^>]+>/g, '');
    expect(t).toContain('Needs me1 decision');
    expect(t).not.toContain('1 decisions');
  });
  it('words the waiting count as the readout does', () => {
    const say = (needsYou: number) => renderToStaticMarkup(createElement(L2Panel, { p: { ...project(4, 9), needsYou }, group: 'g', classes: [], deep, rungs: 9 })).replace(/<[^>]+>/g, '');
    expect([say(1), say(2)].map((t, i) => t.includes(`${i + 1}${waitWords(i + 1)}`))).toEqual([true, true]);
    expect(say(1)).toContain('1decision waits');
  });
});
