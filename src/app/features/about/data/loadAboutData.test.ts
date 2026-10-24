import { describe, expect, it } from 'vitest';
import { DEMO } from '@/lib/demo';
import { demoSource } from '@/server/data/demoSource';
import type { DataSource } from '@/server/data/types';
import { loadAboutData } from './loadAboutData';

describe('loadAboutData', () => {
  it('plays the app loop, beat for beat', () => {
    const d = loadAboutData(demoSource, {});
    expect(d.beats.map((b) => b.key)).toEqual(DEMO.loop.map((b) => b.key));
    expect(d.beats[3]).toMatchObject({ label: 'Proof Block', stage: 'verify' });
  });

  it('demo: the pill says illustrative demo data', () => {
    expect(loadAboutData(demoSource, {}).mode).toEqual({ mode: 'demo', label: 'illustrative demo data', beatsIllustrative: true });
  });

  it('live: the pill says the live label, and the beats stay marked illustrative while the loop is the catalogue one', () => {
    const live: DataSource = { ...demoSource, mode: 'live', illustrative: ['loop'], getPollHealth: () => null };
    const m = loadAboutData(live, {}).mode;
    expect(m.mode).toBe('live');
    expect(m.label).toMatch(/^live data · /);
    expect(m.label).not.toBe('illustrative demo data'); // the status bar's own live words (some parts still demo, marked)
    expect(m.beatsIllustrative).toBe(true);
    expect(loadAboutData({ ...live, illustrative: [] }, {}).mode.beatsIllustrative).toBe(false);
  });
});
