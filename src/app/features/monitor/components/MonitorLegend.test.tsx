import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { FleetProject } from '@/lib/demo/types';
import { leadPaths, slotsAlong } from '../model/beat';
import { MonitorLegend } from './MonitorLegend';

describe('MonitorLegend', () => {
  it('names every case the dashed break draws: not watched, and a watched beat whose armed tracks were not read', () => {
    const p = { id: 'p', state: 'watching', armed: null, needsYou: 0, classTiers: {}, feed: { ageSec: 1, ok: true } } as unknown as FleetProject;
    expect(leadPaths([p], slotsAlong(1, 100, 50, 30)).unknown).not.toBe(''); // the model draws it as the break
    const text = renderToStaticMarkup(<MonitorLegend />);
    expect(text).toContain('Dashed break: not watched');
    expect(text).toContain('armed tracks not read');
  });
});
