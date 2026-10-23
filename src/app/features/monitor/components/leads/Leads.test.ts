import { describe, expect, it, vi } from 'vitest';
import type { FleetProject } from '@/lib/demo/types';
import type { Lead } from '../../model/types';
import { handleLeadsKey } from './Leads';

const proj = (id: string) => ({ id }) as FleetProject;
const lead = (group: string, ids: string[]) => ({ group, projects: ids.map(proj) }) as unknown as Lead;
const leads = [lead('web', ['a', 'b']), lead('api', ['c'])];

/** `on`: the data-id of the focused beat or cell (null: the focus is off a beat, e.g. on the lead plate). */
function press(key: string, selected: string | null, on: string | null = selected) {
  const d = { leads, selected, onPick: vi.fn(), onToggle: vi.fn(), focusId: vi.fn() };
  const preventDefault = vi.fn();
  const target = { getAttribute: (a: string) => (a === 'data-id' ? on : null) } as unknown as EventTarget;
  handleLeadsKey({ key, target, preventDefault }, d);
  return { d, preventDefault };
}

describe('handleLeadsKey', () => {
  it('an arrow picks the next beat and refocuses it', () => {
    const { d, preventDefault } = press('ArrowRight', 'a');
    expect(preventDefault).toHaveBeenCalled();
    expect(d.onPick).toHaveBeenCalledWith('b');
    expect(d.focusId).toHaveBeenCalledWith('b');
  });
  it('Enter on a beat toggles its lead', () => {
    const { d } = press('Enter', 'b');
    expect(d.onToggle).toHaveBeenCalledWith('web');
  });
  it('Enter refocuses the selected beat, because the toggle swaps strip for cells (or back) and unmounts the focused node', () => {
    const { d } = press('Enter', 'c');
    expect(d.focusId).toHaveBeenCalledWith('c');
  });
  it('Enter acts on the focused beat, not on the selection: Tab lands on a beat of another lead without picking it', () => {
    const { d } = press('Enter', 'a', 'c');
    expect(d.onPick).toHaveBeenCalledWith('c');
    expect(d.onToggle).toHaveBeenCalledWith('api');
    expect(d.focusId).toHaveBeenCalledWith('c');
  });
  it('Enter on a cell of the open lead (a native button, no role attribute) closes it', () => {
    const { d } = press('Enter', 'b', 'b');
    expect(d.onToggle).toHaveBeenCalledWith('web');
  });
  it('Enter off a beat (the lead plate button handles its own click) does nothing here', () => {
    const { d } = press('Enter', 'a', null);
    expect(d.onToggle).not.toHaveBeenCalled();
    expect(d.focusId).not.toHaveBeenCalled();
  });
});
