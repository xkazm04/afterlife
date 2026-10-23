import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { FleetProject } from '@/lib/demo/types';
import { leadsOf } from '../../model/totals';
import { Leads } from './Leads';

const p = { id: 'p', name: 'p', group: 'g', state: 'watching', armed: 8, needsYou: 1, tiers: null, feed: { ageSec: 1, ok: true } } as unknown as FleetProject;
const noop = () => undefined;

describe('Leads counts', () => {
  it('speaks one decision in the singular', () => {
    const out = renderToStaticMarkup(
      <Leads leads={leadsOf(['g'], [p])} projects={[p]} openLead={null} selected={null} mark={null} paused={false} onPick={noop} onHover={noop} onLeadHover={noop} onToggle={noop} />,
    );
    expect(out).toMatch(/> decision<\/span>/);
  });
});
