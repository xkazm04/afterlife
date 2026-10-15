import { describe, expect, it } from 'vitest';
import { getSetup } from '@/lib/demo';
import { OTHER_GROUP } from '../../data/capabilities';
import { setupReducer } from '../../model/flow/reducer';
import { createSetupState } from '../../model/flow/state';
import { probeAgeText } from '../../model/flow/probeAge';
import { groupNote } from './SetupToolbar';

// The group menu's note per group must agree with the status bar's probe sentence for the group on screen.
describe('the group menu note', () => {
  const home = createSetupState(getSetup(), 0);
  const other = OTHER_GROUP.name;
  const picked = setupReducer(home, { t: 'pick-group', group: other, now: 1, at: '14:06' });
  const reprobed = setupReducer(picked, { t: 'doctor-end', now: 2, at: '14:07' });

  it('opens on the home group, probed; the other group has not been probed', () => {
    expect(groupNote(home, home.homeGroup)).toBe('probed');
    expect(groupNote(home, other)).toBe('never probed');
  });
  it('picking the other group does not probe it', () => {
    expect(groupNote(picked, other)).toBe('never probed');
    expect(probeAgeText(picked, 3).text).toContain('never probed');
    expect(groupNote(picked, home.homeGroup)).toBe('probed');
  });
  it('after Re-probe on the other group the menu says probed, as the status bar does', () => {
    expect(probeAgeText(reprobed, 3).text).toContain('probed 14:07');
    expect(groupNote(reprobed, other)).toBe('probed');
    expect(groupNote(reprobed, home.homeGroup)).toBe('probed');
  });
  it('a probed group left for home is never probed again when picked back', () => {
    const away = setupReducer(reprobed, { t: 'pick-group', group: home.homeGroup, now: 4, at: '14:08' });
    expect(groupNote(away, other)).toBe('never probed');
  });
});
