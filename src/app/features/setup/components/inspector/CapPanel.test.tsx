// A capability's Probe section says when the doctor last ran. A probe that failed is never shown as a fresh one (the status bar's
// rule, README "Setup"): the page says "probe failed" with the reason, and the rows it still shows are the last good read's.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/overlays/toast/ToastProvider';
import { getActionClasses, getSetup, getTracks } from '@/lib/demo';
import type { LiveSetupRead } from '@/server/data/setup/types';
import { SetupProvider } from '../../hooks/SetupProvider';
import { CapPanel } from './CapPanel';

vi.mock('next/navigation', () => ({ usePathname: () => '/setup/cap', useRouter: () => ({ push: () => {} }) }));

const CAP = 'Pipelines, MRs, releases';
const at = { at: '2026-10-07T09:30:00.000Z', label: '11:30' };

const page = (error: string | null, rows = [{ id: CAP, label: CAP, status: 'available' as const, reason: 'ok' }]) => {
  const steps = Object.fromEntries(Array.from({ length: 15 }, (_, n) => [n, { state: 'unknown' as const, reason: 'not probed' }]));
  const live: LiveSetupRead = {
    group: 'kazdanm', host: 'gitlab.com', project: 'afterlife', projects: ['afterlife'],
    tracks: Object.fromEntries(getSetup().arm.map(([id]) => [id, { state: 'undefined' as const, text: 'not defined' }])),
    tracksAt: at, doctor: { ...at, error, rows }, steps: { ...at, steps },
  };
  return renderToStaticMarkup(
    <ToastProvider>
      <SetupProvider setup={getSetup()} tracks={getTracks()} classes={getActionClasses()} live={live}>
        <CapPanel name={CAP} />
      </SetupProvider>
    </ToastProvider>,
  );
};

describe('Setup, a capability page: the probe section', () => {
  it('a doctor read that worked shows its time and no failure', () => {
    const html = page(null);
    expect(html).toContain('11:30');
    expect(html).not.toContain('probe failed');
    expect(html).not.toContain('last good read');
  });

  it('a doctor read that failed says "probe failed" with the reason, never the bare time of a fresh probe', () => {
    const html = page('glab: 401 Unauthorized');
    expect(html).toContain('probe failed 11:30');
    expect(html).toContain('afterlife doctor: glab: 401 Unauthorized');
    expect(html).toContain('available · last good read');
  });

  it('a probe that failed with no rows has no last good read to show: the status is unknown, said plainly', () => {
    const html = page('afterlife doctor failed: glab not found', []);
    expect(html).toContain('probe failed 11:30');
    expect(html).not.toContain('last good read');
    expect(html).toContain('>unknown<');
  });
});
