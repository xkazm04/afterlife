import { describe, expect, it } from 'vitest';
import { decodeListState } from '@/app/features/fleet/model/list/urlState';
import type { ScreenProps } from '../data/screenProps';
import { fromWire, toWire } from './wire';

const fleet = (query: string) => ({ start: decodeListState(new URLSearchParams(query)) }) as unknown as ScreenProps['fleet'];
const viaJson = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

describe('screen props on the wire', () => {
  it("fleet's start state survives JSON: its Sets go as arrays and come back as Sets", () => {
    const props = fleet('fold=g1&fold=g2&state=blocked&tier=assisted&q=zeta&flat=1');
    const wire = toWire('fleet', props);
    expect(wire.start.collapsed).toEqual(['g1', 'g2']);
    expect(wire.start.filters.tiers).toEqual(['assisted']);
    const back = fromWire('fleet', viaJson(wire));
    expect(back.start).toEqual(props.start);
    expect(back.start.collapsed).toBeInstanceOf(Set);
    expect(back.start.filters.states).toBeInstanceOf(Set);
  });

  it('the default state round-trips too', () => {
    const props = fleet('');
    expect(fromWire('fleet', viaJson(toWire('fleet', props))).start).toEqual(props.start);
  });

  it('the other screens pass through untouched', () => {
    const monitor = { data: { a: 1 }, estate: { b: [2] } } as unknown as ScreenProps['monitor'];
    expect(toWire('monitor', monitor)).toBe(monitor);
    expect(fromWire('monitor', monitor)).toBe(monitor);
  });
});
