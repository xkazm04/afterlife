// A track's page says where each of its classes stands now (the Ladder's action classes), with the gate last seen deciding
// for each, and that arming grants no tier. It never projects a tier on arming, and never says "not enforced" from the
// track's arm content alone.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/overlays/toast/ToastProvider';
import { getActionClasses, getSetup, getTracks } from '@/lib/demo';
import type { ActionClass } from '@/lib/demo/types';
import type { LiveSetupRead } from '@/server/data/setup/types';
import { SetupProvider } from '../../hooks/SetupProvider';
import { TrackPanel } from './TrackPanel';

vi.mock('next/navigation', () => ({ usePathname: () => '/setup/track-T1', useRouter: () => ({ push: () => {} }) }));

const page = (classes: readonly ActionClass[], live: LiveSetupRead | null = null) =>
  renderToStaticMarkup(
    <ToastProvider>
      <SetupProvider setup={getSetup()} tracks={getTracks()} classes={classes} live={live}>
        <TrackPanel id="T1" />
      </SetupProvider>
    </ToastProvider>,
  );

describe('Setup, a track page: its classes where they stand now', () => {
  it('demo: T1 lists dep-bump.patch at Hands-off (its real standing) with the demo gate last seen, marked demo', () => {
    const html = page(getActionClasses());
    expect(html).toContain('Standing');
    expect(html).toMatch(/dep-bump\.patch<\/code>.*?Hands-off/);
    expect(html).toContain('Gate last seen !41 at Hands-off, 4.9 h ago');
    expect(html).toMatch(/code-fix\.patch<\/code>.*?Supervised/);
    expect(html).toContain('>demo<');
    expect(html).toContain('Arming does not grant a tier and does not write tier-state.yml');
    expect(html).not.toContain('Tier on arming');
    expect(html).not.toContain('not enforced');
  });

  it('live: a class the gate has not decided for since its since says so; arm content Belay lacks prints no "not enforced"', () => {
    const at = { at: '2026-10-07T09:30:00.000Z', label: '11:30' };
    const steps = Object.fromEntries(Array.from({ length: 15 }, (_, n) => [n, { state: 'unknown' as const, reason: 'not probed' }]));
    const live: LiveSetupRead = {
      group: 'kazdanm', host: 'gitlab.com', project: 'afterlife', projects: ['afterlife'],
      tracks: Object.fromEntries(getSetup().arm.map(([id]) => [id, { state: 'undefined' as const, text: 'not defined' }])),
      tracksAt: at, doctor: { ...at, error: null, rows: [] }, steps: { ...at, steps },
    };
    const classes = getActionClasses().map((c) => (c.id === 'dep-bump.patch' ? { ...c, gateSeen: null, since: '2026-09-20T08:00:00.000Z' } : c));
    const html = page(classes, live);
    expect(html).toMatch(/dep-bump\.patch<\/code>.*?Hands-off/);
    expect(html).toContain('Gate not seen since 2026-09-20');
    expect(html).not.toContain('not enforced');
    expect(html).not.toContain('>demo<');
  });
});
