import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { demoSource, setDataSource } from '@/server/data';
import { TierPopover } from '../components/popover/TierPopover';
import { loadFleetData } from './loadFleetData';
import { loadFleetProject } from './loadFleetProject';

afterEach(() => setDataSource(null));

describe('loadFleetProject', () => {
  it('finds a project by its id, with the fleet data its sections read', () => {
    setDataSource(demoSource);
    const v = loadFleetProject(demoSource.deepProjectId());
    expect(v?.project.id).toBe(demoSource.deepProjectId());
    expect(v?.data.classes.length).toBeGreaterThan(0);
    expect(v?.view.mode).toBe('demo');
  });

  it('is null for an id no project has', () => {
    setDataSource(demoSource);
    expect(loadFleetProject('no-such-project')).toBeNull();
  });
});

describe('loadFleetData: the /fleet client gets the deep id and its records, nothing deeper', () => {
  it('has no deep key and no deep task title; the popover’s records travel', () => {
    setDataSource(demoSource);
    const data = loadFleetData() as unknown as Record<string, unknown>;
    expect('deep' in data).toBe(false);
    expect(JSON.stringify(data)).not.toContain('Fix path traversal in statement export');
    expect((data.records as Record<string, string> | undefined)?.['dep-bump.patch']).toBe('16/15 accepted');
  });
});

describe('TierPopover (guard)', () => {
  const tierOf = (id: string) => {
    const p = loadFleetData().projects.find((x) => x.id === id)!;
    return { p, tier: p.classTiers['dep-bump.patch'] ?? 'hands_off' };
  };
  const html = (id: string) => {
    setDataSource(demoSource);
    const data = loadFleetData();
    const { p, tier } = tierOf(id);
    if (tier === 'no_record' || tier === 'refused') throw new Error('not a tier');
    return renderToString(createElement(TierPopover, { p, tier, classes: data.classes, records: p.id === data.deepId ? data.records : {} }));
  };
  it('ledgerline’s card lists dep-bump.patch’s record; fx-rates’ card lists none', () => {
    expect(html('ledgerline')).toContain('16/15 accepted');
    expect(html('fx-rates')).not.toContain('accepted');
  });
});
