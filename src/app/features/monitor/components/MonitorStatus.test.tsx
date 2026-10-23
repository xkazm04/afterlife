import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MonitorStatus } from './MonitorStatus';

const html = (mode: 'demo' | 'live', ageSec: number | null) => renderToStaticMarkup(<MonitorStatus n={184} leads={7} waiting={3} mode={mode} ageSec={ageSec} />);

describe('MonitorStatus', () => {
  it('says there is no good poll yet when the project has none, in both modes, never a number of seconds', () => {
    for (const mode of ['demo', 'live'] as const) {
      const out = html(mode, null);
      expect(out).toContain('no good poll yet');
      expect(out).not.toContain('polled');
    }
  });
  it('says a fleet of one project on one lead in the singular', () =>
    expect(renderToStaticMarkup(<MonitorStatus n={1} leads={1} waiting={1} mode="live" ageSec={12} />)).toContain('1 project on 1 lead · 1 decision waits'));
  it('says the project row age when it has one', () => expect(html('live', 12)).toContain('polled 12 s ago'));
});
