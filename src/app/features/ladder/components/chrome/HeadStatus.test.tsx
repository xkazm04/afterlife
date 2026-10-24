// The list and the class page end their status line the same way: the head, its demo mark, the stale mark, the poll age.
// Demo: the simulated poll's age wraps every 15 s; live: the snapshot's age counts up.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HeadStatus } from './HeadStatus';

const text = (html: string) => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const head = { sha: 'c3d4', by: 'tripwire' };

describe('the status tail', () => {
  it('demo: the poll age wraps at the 15 s period; live: it counts up from the load', () => {
    expect(text(renderToStaticMarkup(<HeadStatus head={head} stale={null} live={false} elapsed={3} feedAgeSec={12} />))).toBe('tier-state.yml @ c3d4 · polled 0 s ago');
    expect(text(renderToStaticMarkup(<HeadStatus head={head} stale={null} live elapsed={3} feedAgeSec={12} />))).toBe('tier-state.yml @ c3d4 · polled 15 s ago');
  });
  it('marks a demo head and stale tiers', () => {
    const html = renderToStaticMarkup(<HeadStatus head={{ ...head, demo: true }} stale={{ reason: 'HTTP 403', lastOk: null }} live elapsed={0} feedAgeSec={0} />);
    expect(text(html)).toMatch(/^tier-state\.yml @ c3d4 demo · class tiers stale belay-policy: HTTP 403 \(never read\) · polled 0 s ago$/);
  });
});
