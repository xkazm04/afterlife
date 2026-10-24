// The door's Screens menu lists the app's own navigation.
import { describe, expect, it } from 'vitest';
import { APP_NAV, SETTINGS_NAV } from '@/components/shell/sidebar/navItems';
import { SCREENS } from '../components/chrome/Chrome';

describe('Screens menu', () => {
  it('lists every navigation entry, Settings included, in the sidebar order, then About', () => {
    expect(SCREENS.map(([, href]) => href)).toEqual([...[...APP_NAV, SETTINGS_NAV].map((e) => e.href), '/about']);
    expect(SCREENS.map(([name]) => name)).toEqual([...[...APP_NAV, SETTINGS_NAV].map((e) => e.label), 'About']);
    expect(SCREENS).toHaveLength(14);
  });
});

