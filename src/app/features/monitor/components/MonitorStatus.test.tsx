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
  it('says the project row age when it has one', () => expect(html('live', 12)).toContain('polled 12 s ago'));
});
