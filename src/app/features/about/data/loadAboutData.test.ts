import { describe, expect, it } from 'vitest';
import { DEMO } from '@/lib/demo';
import { demoSource } from '@/server/data/demoSource';
import type { DataSource } from '@/server/data/types';
import { loadAboutData } from './loadAboutData';

describe('loadAboutData', () => {
  it('plays the app loop, beat for beat', () => {
    const d = loadAboutData(demoSource);
    expect(d.beats.map((b) => b.key)).toEqual(DEMO.loop.map((b) => b.key));
    expect(d.beats[3]).toMatchObject({ label: 'Proof Block', stage: 'verify' });
  });

  it('sends the beats only: no data mode, in demo or live', () => {
    expect(Object.keys(loadAboutData(demoSource))).toEqual(['beats']);
    const live: DataSource = { ...demoSource, mode: 'live', illustrative: ['loop'], getPollHealth: () => null };
    expect(Object.keys(loadAboutData(live))).toEqual(['beats']);
  });
});
