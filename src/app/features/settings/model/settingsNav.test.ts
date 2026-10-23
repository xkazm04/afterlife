import { describe, expect, it } from 'vitest';
import { SETTINGS_PAGES, activeSettingsKey, settingsStatus } from './settingsNav';

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

describe('settingsStatus', () => {
  it('gives each sub-page its own line, and only Display claims the browser', () => {
    expect(new Set(SETTINGS_PAGES.map((p) => settingsStatus(p.key))).size).toBe(3);
    expect(settingsStatus('display')).toMatch(/saved in this browser/);
    expect(settingsStatus('data')).toMatch(/server's environment/);
    for (const k of ['keyboard', 'data', 'about']) expect(settingsStatus(k)).not.toMatch(/saved in this browser/);
  });
});
