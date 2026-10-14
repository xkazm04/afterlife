import { describe, expect, it } from 'vitest';
import { SETTINGS_PAGES, activeSettingsKey } from './settingsNav';

describe('activeSettingsKey', () => {
  it('matches every sub-page by its href', () => {
    for (const p of SETTINGS_PAGES) expect(activeSettingsKey(p.href)).toBe(p.key);
  });
  it('is null for /settings itself (it redirects), other screens and unknown names', () => {
    expect(activeSettingsKey('/settings')).toBeNull();
    expect(activeSettingsKey('/fleet')).toBeNull();
    expect(activeSettingsKey('/settings/displays')).toBeNull();
  });
});
