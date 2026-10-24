// The sidebar draws SMART_ICONS[id] for each smart filter: a hand-kept map beside SMART_FILTERS. A filter added without
// an icon would draw none, silently; an icon left behind by a removed filter would never draw. Pinned to the filters.
import { describe, expect, it } from 'vitest';
import { SMART_FILTERS } from '../../model/view/filters';
import { SMART_ICONS } from './smartIcons';

describe('the smart filters and their icons', () => {
  it('every smart filter has an icon, and every icon a filter', () => {
    expect(Object.keys(SMART_ICONS).sort()).toEqual(SMART_FILTERS.map((s) => s.id).sort());
    for (const s of SMART_FILTERS) expect(SMART_ICONS[s.id]).toBeTruthy();
  });
});
