import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { FleetProject, NeedsYouItem } from '@/lib/demo/types';
import { Decisions } from './Decisions';

const proj = (o: Partial<FleetProject>): FleetProject => ({ id: 'deep', name: 'ledgerline', state: 'watching', needsYou: 0, feed: { ageSec: 12, ok: true }, ...o }) as FleetProject;
const item = (id: string): NeedsYouItem => ({ id, title: `title ${id}`, does: `does ${id}` }) as NeedsYouItem;

const html = (p: FleetProject, needs: readonly NeedsYouItem[], live = true, isDeep = true) =>
  renderToStaticMarkup(
    <Decisions p={p} isDeep={isDeep} needs={needs} live={live} done={new Set()} onResolve={() => undefined} onFlash={() => undefined} onRepoll={() => undefined} />,
  );

describe('Decisions on the deep project', () => {
  it('lists its decisions, one item each', () => {
    const out = html(proj({ needsYou: 2 }), [item('a'), item('b')]);
    expect(out).toContain('title a');
    expect(out).toContain('title b');
  });
  it('says nothing waits when it has no decisions (live drops the demo seeds, so the list can be empty)', () => {
    expect(html(proj({ needsYou: 0 }), [])).toContain('Nothing waits for you here');
  });
  it('still says how many wait, and where to take them, when the count is ahead of the listed items', () => {
    const out = html(proj({ needsYou: 3 }), []);
    expect(out).toContain('3 decisions wait');
    expect(out).toContain('Review in Needs you');
  });
});
