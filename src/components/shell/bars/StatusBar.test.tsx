import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ToastProvider } from '@/components/overlays/toast/ToastProvider';
import { DEMO_SHELL, PENDING_SHELL, ShellProvider, type ShellData } from '../ShellContext';
import { StatusBar } from './StatusBar';

const render = (data?: ShellData) => {
  const bar = <StatusBar>left</StatusBar>;
  return renderToString(<ToastProvider>{data ? <ShellProvider value={{ needsYouCount: 0, data }}>{bar}</ShellProvider> : bar}</ToastProvider>);
};
const live: ShellData = { mode: 'live', fakeGitlab: false, group: 'kazdanm', illustrative: false, poll: null };
const health = { ageSec: 12, error: null, failing: 0, of: 7, intervalSec: 30 };

describe('StatusBar data label', () => {
  it('says illustrative demo data without a provider', () => {
    expect(render()).toContain('illustrative demo data');
  });
  it('before the shell read streams in (PENDING_SHELL): unknown, a dash, never demo and no poll line', () => {
    const html = renderToString(<ToastProvider><ShellProvider value={PENDING_SHELL}><StatusBar>left</StatusBar></ShellProvider></ToastProvider>);
    expect(html).toContain('data —');
    expect(html).not.toMatch(/demo data|live data|live mode|polled/);
  });
  it('a real project screen says real project data, even in demo mode', () => {
    const html = renderToString(<ToastProvider><ShellProvider value={DEMO_SHELL}><StatusBar realData>left</StatusBar></ShellProvider></ToastProvider>);
    expect(html).toContain('real project data');
    expect(html).not.toContain('illustrative demo data');
  });
  it('says illustrative demo data in demo mode', () => {
    expect(render(DEMO_SHELL.data)).toContain('illustrative demo data');
  });
  it('names live data and the group in live mode, never demo', () => {
    const html = render(live);
    expect(html).toContain('live data · kazdanm');
    expect(html).not.toContain('illustrative demo data');
    expect(html).not.toContain('still demo');
  });
  it('says some parts are still demo while the source declares them', () => {
    const html = render({ ...live, illustrative: true });
    expect(html).toContain('live data · kazdanm · some parts still demo, marked');
    expect(html).not.toContain('illustrative demo data');
  });
  it('says the seeded fake GitLab, not a real group', () => {
    const html = render({ ...live, fakeGitlab: true, illustrative: true });
    expect(html).toContain('live mode · seeded fake GitLab, not a real group');
    expect(html).not.toContain('illustrative demo data');
  });
});

describe('StatusBar poll line', () => {
  it('live: says how old the last good poll is, with no Re-poll while it is fine', () => {
    const html = render({ ...live, poll: health });
    expect(html).toContain('polled 12s ago');
    expect(html).not.toContain('Re-poll');
    expect(html).toContain('live data · kazdanm'); // the data label stays
  });
  it('live: a failed poll says so, with its reason, and offers Re-poll', () => {
    const html = render({ ...live, poll: { ...health, ageSec: 300, error: 'HTTP 401 Unauthorized', failing: 7 } });
    expect(html).toContain('last poll failed: HTTP 401 Unauthorized · last good 5m ago');
    expect(html).toMatch(/<button[^>]*>Re-poll<\/button>/);
  });
  it('demo: no poll line and no Re-poll, only the demo label', () => {
    for (const html of [render(), render(DEMO_SHELL.data)]) {
      expect(html).toContain('illustrative demo data');
      expect(html).not.toContain('polled');
      expect(html).not.toContain('Re-poll');
    }
  });
});
