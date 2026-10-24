import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { FleetProject, NeedsYouItem } from '@/lib/demo/types';
import { Decisions } from './Decisions';
import { DecisionRow } from './decisions/DecisionRow';

const proj = (o: Partial<FleetProject>): FleetProject => ({ id: 'deep', name: 'ledgerline', state: 'watching', needsYou: 0, feed: { ageSec: 12, ok: true }, ...o }) as FleetProject;
const item = (id: string): NeedsYouItem => ({ id, title: `title ${id}`, does: `does ${id}` }) as NeedsYouItem;

const html = (p: FleetProject, needs: readonly NeedsYouItem[], live = true, isDeep = true) =>
  renderToStaticMarkup(
    <Decisions p={p} isDeep={isDeep} needs={needs} live={live} done={new Set()} onResolve={() => undefined} onFlash={() => undefined} onRepoll={() => undefined} />,
  );

describe('Decisions on the deep project', () => {
  it('lists its decisions, one shut row each: titles only, no buttons until one opens', () => {
    const out = html(proj({ needsYou: 2 }), [item('a'), item('b')]);
    expect(out).toContain('title a');
    expect(out).toContain('title b');
    expect(out.match(/aria-expanded="false"/g)).toHaveLength(2);
    expect(out).not.toContain('aria-expanded="true"');
    expect(out).not.toContain('does a');
    expect(out).not.toContain('Decide in Needs you');
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

const promote: NeedsYouItem = {
  id: 'n1',
  kind: 'promote',
  title: 'Promote T7 qa',
  from: 'supervised',
  to: 'hands_off',
  rules: [
    ['clean days ≥ 14', '14', true],
    ['accepted outputs ≥ 15', '9', false],
  ],
  reason: 'held its tier a fortnight',
  dueIn: '19 h 12 m',
  does: 'Opens a policy MR as you.',
};
const row = (o: { live?: boolean; done?: boolean; open?: boolean }, d: NeedsYouItem = promote) =>
  renderToStaticMarkup(
    <DecisionRow d={d} open={o.open ?? true} live={o.live ?? false} done={o.done ?? false} onToggle={() => undefined} onResolve={() => undefined} onFlash={() => undefined} />,
  );

describe('one decision row', () => {
  it('reads its kind, title and due time in the shut row', () => {
    const out = row({ open: false });
    expect(out).toContain('Promotion');
    expect(out).toContain('title="Promote T7 qa"');
    expect(out).toContain('19 h 12 m');
    expect(out).not.toContain('Opens a policy MR');
    expect(out).not.toContain('Open policy MR');
  });
  it('opens to what it does, why, the move, its rules met and unmet, and the demo decide buttons', () => {
    const out = row({});
    expect(out).toContain('aria-expanded="true"');
    expect(out).toContain('Opens a policy MR as you.');
    expect(out).toContain('Why: held its tier a fortnight');
    expect(out).toContain('Supervised → Hands-off');
    expect(out).toContain('data-met="true"');
    expect(out).toContain('data-met="false"');
    expect(out).toContain('Open policy MR');
    expect(out).toContain('Not now');
  });
  it('live: the one button opens Needs you, nothing is decided here', () => {
    const out = row({ live: true });
    expect(out).toContain('Decide in Needs you');
    expect(out).toContain('href="/needs-you"');
    expect(out).not.toContain('Open policy MR');
  });
  it('done: says so in the row, and offers no buttons', () => {
    const out = row({ done: true });
    expect(out).toContain('✓ Done');
    expect(out).not.toContain('19 h 12 m');
    expect(out.match(/<button/g)).toHaveLength(1); // the row's own head, nothing to decide
    expect(out).not.toContain('Open policy MR');
    expect(out).toContain('Opens a policy MR as you.');
  });
});
