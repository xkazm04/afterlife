// The action cell of a row, one state per kind of cell the index can read: a note for Human only and unknown, the Setup
// link for no record yet, Re-admit for a real quarantine only, and for a tier the split Revoke button plus Promote
// (primary when eligible, greyed and aria-disabled otherwise).
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { Promotion } from '@/lib/promotion';
import type { ClassRow } from '../../model/types';
import { ActionCell } from './ActionCell';

vi.mock('next/link', () => ({ default: (p: { href: string; title?: string; children?: unknown }) => createElement('a', { href: p.href, title: p.title }, p.children as never) }));

const row = (over: Partial<ClassRow>): ClassRow => ({ id: 'dep-bump.patch', track: 'T1', ceiling: 'hands_off', tier: 'hands_off', lease_days: null, lastMove: '', pending: null, record: null, ...over });
const none = () => undefined;
const render = (cls: ClassRow, promotion: Promotion = { kind: 'ceiling' }): string =>
  renderToStaticMarkup(<ActionCell cls={cls} promotion={promotion} onSelect={none} onRevoke={none} onTargets={none} onPromote={none} />);
const text = (html: string): string => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

describe('the action cell', () => {
  it('Human only: a note, no button', () => {
    const html = render(row({ tier: 'human_only', ceiling: 'human_only' }));
    expect(text(html)).toBe('never an agent');
    expect(html).not.toContain('<button');
  });
  it('no record yet: a link to the track\'s Setup page; with no known track, plain text', () => {
    expect(render(row({ cell: 'no_record' }))).toContain('href="/setup/track-T1"');
    const plain = render(row({ cell: 'no_record', track: 'elsewhere' }));
    expect(text(plain)).toBe('no record yet');
    expect(plain).not.toContain('href');
  });
  it('unknown tier: a note, no button', () => {
    const html = render(row({ cell: null }));
    expect(text(html)).toBe('unknown');
    expect(html).not.toContain('<button');
  });
  it('a real quarantine: Re-admit and nothing to revoke', () => {
    const html = render(row({ tier: 'quarantined' }), { kind: 'readmit' });
    expect(text(html)).toBe('Re-admit');
  });
  it('a tier: Revoke to the next rung down, the target menu and Promote', () => {
    const html = render(row({ tier: 'hands_off' }));
    expect(html).toContain('aria-label="Revoke to Supervised"');
    expect(html).toContain('aria-label="More revoke targets"');
    expect(text(html)).toContain('Promote');
  });
  it('Promote is primary when eligible, and greyed with the reason as its title otherwise', () => {
    const eligible = render(row({ tier: 'supervised' }), { kind: 'eligible', next: 'hands_off', rules: [], precondition: '' });
    expect(eligible).toContain('title="Promote via a policy MR (p)"');
    expect(eligible).toContain('aria-disabled="false"');
    const not = render(row({ tier: 'supervised' }), { kind: 'notyet', next: 'hands_off', rules: [{ name: 'accepted outputs', value: '3 / 15', met: false }], precondition: '' });
    expect(not).toContain('aria-disabled="true"');
    expect(not).toContain('Record does not qualify yet: ');
  });
  it('Assisted can still be revoked, to Quarantined', () => {
    expect(render(row({ tier: 'assisted' }))).toContain('aria-label="Revoke to Quarantined"');
  });
});
