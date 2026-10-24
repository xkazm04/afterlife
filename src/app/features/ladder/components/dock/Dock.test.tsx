// The docked strip says, for one write at a time, which write it is and what the server planned (or why it refuses). The
// revoke and the promotion say the same three things after their own heads: asked for, refused, and the commands.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ActionPreview } from '@/server/actions/types';
import type { DockModel } from '../../model/rules/dock';
import type { PromoteView } from '../../write/promote';
import type { WriteView } from '../../write/revoke';
import { Dock } from './Dock';

const preview = (mode: 'demo' | 'live'): ActionPreview => ({
  kind: 'revoke-class', title: 't', summary: 's', risk: 'policy', previewId: 'p1', mode, diff: [],
  commands: [
    { display: 'glab api --method PUT projects/9/repository/files/tier-state.yml -f branch=main', argv: [], risk: 'policy' },
    { display: 'glab api --method POST projects/9/merge_requests', argv: [], risk: 'policy' },
  ],
});
const text = (model: DockModel): string =>
  renderToStaticMarkup(<Dock model={model} onHelp={() => undefined} helpRef={null} />).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&');
const HEAD_END = 'jk move';

const revoke = (view: WriteView | undefined, previewing = false): DockModel => ({ kind: 'write', id: 'dep-bump.patch', to: 'supervised', previewing, view });
const promote = (view: PromoteView | undefined, readmit = false): DockModel => ({ kind: 'promote', id: 'dep-bump.patch', to: 'hands_off', readmit, view });
const line = (t: string): string => t.slice(0, t.indexOf(HEAD_END)).trim();

describe('the revoke line', () => {
  it('asked for: names the write and says it is waiting for Belay', () => {
    expect(line(text(revoke(undefined)))).toBe('r ▸ Revoke · direct commit · dep-bump.patch → Supervised · asking Belay for the exact write…');
  });
  it('previewing a hovered target leads with Enter, not r', () => {
    expect(line(text(revoke(undefined, true)))).toMatch(/^↵ ▸ Revoke/);
  });
  it('refused: gives the reason', () => {
    expect(line(text(revoke({ kind: 'refused', reason: 'no' })))).toBe('r ▸ Revoke · direct commit · dep-bump.patch → Supervised · Belay refuses this write: no');
  });
  it('planned: the commands cut at their first field, joined by &&, with the mode note', () => {
    expect(line(text(revoke({ kind: 'preview', preview: preview('live') })))).toBe(
      'r ▸ Revoke · direct commit · dep-bump.patch → Supervised · glab api --method PUT projects/9/repository/files/tier-state.yml … && glab api --method POST projects/9/merge_requests (belay-policy, as you)',
    );
    expect(line(text(revoke({ kind: 'preview', preview: preview('demo') })))).toContain('(demo: simulated, nothing is sent)');
  });
});

describe('the promote line', () => {
  it('asked for, refused, planned: the same three words after the promotion head', () => {
    expect(line(text(promote(undefined)))).toBe('p ▸ Promote · policy MR a person merges · dep-bump.patch → Hands-off · asking Belay for the exact write…');
    expect(line(text(promote({ kind: 'refused', reason: 'no' }, true)))).toBe('p ▸ Re-admit · policy MR a person merges · dep-bump.patch → Hands-off · Belay refuses this write: no');
    expect(line(text(promote({ kind: 'preview', preview: preview('demo') })))).toMatch(/Hands-off · glab api .* \(demo: simulated, nothing is sent\)$/);
  });
  it('sent: the MR it opened, with a link', () => {
    const t = renderToStaticMarkup(<Dock model={promote({ kind: 'sent', mr: '!22', url: 'https://gitlab.example/mr/22', simulated: false })} onHelp={() => undefined} helpRef={null} />);
    expect(t).toContain('Opened !22');
    expect(t).toContain('href="https://gitlab.example/mr/22"');
  });
});

describe('the other lines', () => {
  it('none, group and idle', () => {
    expect(line(text({ kind: 'none' }))).toBe('select a class · r revokes one step');
    expect(line(text({ kind: 'group', id: 'T1', key: 'deps' }))).toBe('T1 deps · select a class · r revokes one step');
    expect(line(text({ kind: 'idle', id: 'x', reason: 'never an agent' }))).toBe('x · nothing to revoke: never an agent');
  });
});

describe("a track header's line", () => {
  // the third write on the strip says the same three tails as the revoke and the promotion (one Planned, not a copy)
  const batch = (view: WriteView | undefined): DockModel => ({
    kind: 'batch', id: 'T1', want: 'quarantine', view,
    changes: [{ id: 'a', to: 'quarantined' }, { id: 'b', to: 'quarantined' }], skipped: [{ id: 'c', why: 'never an agent' }],
  });
  const lead = 'q ▸ Revoke · direct commit · Quarantine track T1 · 2 classes in one commit · leaves c (never an agent) ·';
  it('asked for, refused and planned, after the same tails as the revoke', () => {
    expect(line(text(batch(undefined)))).toBe(`${lead} asking Belay for the exact write…`);
    expect(line(text(batch({ kind: 'refused', reason: 'tier-state.yml moved' })))).toBe(`${lead} Belay refuses this write: tier-state.yml moved`);
    const tail = (v: WriteView) => line(text(batch(v))).slice(lead.length);
    const revokeTail = (v: WriteView) => line(text(revoke(v))).slice(line(text(revoke(undefined))).length - 'asking Belay for the exact write…'.length);
    for (const mode of ['demo', 'live'] as const) expect(tail({ kind: 'preview', preview: preview(mode) }).trim()).toBe(revokeTail({ kind: 'preview', preview: preview(mode) }).trim());
  });
});
