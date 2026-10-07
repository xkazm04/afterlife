import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ToastProvider } from '@/components/overlays/toast/ToastProvider';
import { DEMO_SHELL, ShellProvider, type ShellData } from '../ShellContext';
import { StatusBar } from './StatusBar';

const render = (data?: ShellData) => {
  const bar = <StatusBar>left</StatusBar>;
  return renderToString(<ToastProvider>{data ? <ShellProvider value={{ needsYouCount: 0, data }}>{bar}</ShellProvider> : bar}</ToastProvider>);
};
const live: ShellData = { mode: 'live', fakeGitlab: false, group: 'kazdanm', illustrative: false };

describe('StatusBar data label', () => {
  it('says illustrative demo data without a provider', () => {
    expect(render()).toContain('illustrative demo data');
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
