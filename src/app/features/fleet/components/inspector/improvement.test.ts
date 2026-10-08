import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DEMO } from '@/lib/demo';
import type { DeepProject } from '../../model/types';
import { ImprovementSection } from './sections/ImprovementSection';

const deep = { id: 'ledgerline', cycle: { running: 'C7', closed: 6, held: 19, gained: 17 } } as DeepProject;
const sec = { open: true, onOpenChange: () => {} };
const html = (id: string) => {
  const p = DEMO.fleet.projects.find((x) => x.id === id)!;
  return renderToStaticMarkup(createElement(ImprovementSection, { p, deep, sec }));
};

describe('the improvement section', () => {
  it('says what the cycles earned for the project in cycles', () => {
    expect(html('ledgerline')).toContain('+17</b> rungs since day 0');
    expect(html('ledgerline')).toContain('C7 running');
  });
  it('offers to start a cycle for a watched project, and onboarding for one not yet watched', () => {
    const watched = DEMO.fleet.projects.find((p) => p.state === 'watching' && p.id !== 'ledgerline')!;
    expect(html(watched.id)).toContain('Start in Onboard');
    expect(html('legacy-batch')).toContain('Onboard it');
  });
});
