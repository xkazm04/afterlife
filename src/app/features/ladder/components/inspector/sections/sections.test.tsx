// The grant's lease and the no-edit bar are trust-policy.yml's (grant_ttl_days, no_edit_ratio), not constants; the write
// sections say which write a key confirms, and a sent promotion links the MR the server named.
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { parse } from 'yaml';
import { rulesOf } from '@/server/data/policy';
import type { ActionPreview } from '@/server/actions/types';
import { parsePolicy } from '../../../../../../../engine/policy/load';
import { WRITE_HEAD } from '../../../model/rules/promote';
import type { ClassRow } from '../../../model/types';
import { RecordCells } from '../../table/RecordCells';
import { GrantSection } from './GrantSection';
import { WriteSection } from './WriteSection';

vi.mock('next/link', () => ({ default: (p: { href: string; children?: unknown }) => createElement('a', { href: p.href }, p.children as never) }));

const policyWith = (edit: (yml: string) => string) => rulesOf(parsePolicy(parse(edit(readFileSync('policy/trust-policy.yml', 'utf8')))));
const seven = policyWith((y) => y.replace(/grant_ttl_days: \d+/, 'grant_ttl_days: 7'));
const none = policyWith((y) => y.replace(/^grant_ttl_days:.*$/m, ''));
const cls: ClassRow = {
  id: 'dep-bump.patch', track: 'T1', ceiling: 'hands_off', tier: 'hands_off', lease_days: 5, lastMove: '', pending: null,
  record: { accepted: 16, needed: 15, noEdit: 0.85, cleanDays: 14, reverts: 0 },
};
const grant = (policy: typeof seven) => renderToStaticMarkup(<GrantSection cls={cls} policy={policy} proofClass="exploit-test" proofDemo={false} live />);
const cells = (policy: typeof seven) => renderToStaticMarkup(<RecordCells cls={cls} policy={policy} />).split('role="gridcell"');

describe('the lease and the no-edit bar come from the policy', () => {
  it('grant_ttl_days: 7 reads "of 7" in the Grant section and the Lease cell', () => {
    expect(seven?.leaseDays).toBe(7);
    expect(grant(seven)).toContain('5 d left of 7, then Supervised');
    expect(cells(seven)[1]).toContain('title="5 d left of 7, then Supervised unless a person re-confirms"');
  });
  it('a policy with no grant_ttl_days: no lease line', () => {
    expect(none?.leaseDays).toBeNull();
    expect(grant(none)).not.toContain('Lease');
    expect(cells(none)[1]).not.toContain('d left');
  });
  it('lease_days 0 on a Hands-off grant is a lapsed lease, gated at Supervised, not "—"; on a lower tier it is no line', () => {
    const lapsed = { ...cls, lease_days: 0 };
    for (const policy of [seven, none]) {
      expect(renderToStaticMarkup(<GrantSection cls={lapsed} policy={policy} proofClass="exploit-test" proofDemo={false} live />)).toContain('lapsed · gated at Supervised until a person re-confirms');
      const cell = renderToStaticMarkup(<RecordCells cls={lapsed} policy={policy} />).split('role="gridcell"')[1];
      expect(cell).toContain('>lapsed<');
      expect(cell).toContain('title="Lease lapsed: the gate decides at Supervised until a person re-confirms"');
    }
    const lower = { ...lapsed, tier: 'supervised' as const };
    expect(renderToStaticMarkup(<RecordCells cls={lower} policy={seven} />).split('role="gridcell"')[1]).not.toContain('lapsed');
  });
  it('No-edit dims below the policy no_edit_ratio, not below a constant', () => {
    expect(cells(seven)[3]).toContain('85 %');
    const dim = (ratio: string) => cells(policyWith((y) => y.replace(/no_edit_ratio: [\d.]+/, `no_edit_ratio: ${ratio}`)))[3];
    expect(dim('0.80')).not.toMatch(/class="[^"]+">85 %/);
    expect(dim('0.90')).toMatch(/class="[^"]+">85 %/);
  });
});

describe('the grant: the gated outputs and the gate last seen', () => {
  const held: ClassRow = { ...cls, id: 'code-fix.patch', tier: 'supervised', ceiling: 'supervised', record: { ...cls.record!, accepted: 6, gated: 3 } };
  const seen = { iid: 39, tierAtTime: 'supervised' as const, at: '2026-10-05T16:10:00.000Z' };
  it('demo: the gated count, and the demo gate read against the demo clock, marked demo', () => {
    const out = renderToStaticMarkup(<GrantSection cls={{ ...held, gateSeen: seen }} policy={seven} proofClass="exploit-test" proofDemo={false} live={false} />);
    expect(out).toContain('3 of 6 accepted');
    expect(out).toContain('Gate last seen !39 at Supervised, 22.2 h ago');
    expect(out).toContain('>demo<');
  });
  it('live: none seen since the record’s since says so; a count nothing states is not recorded; a human-only class has no gate line', () => {
    const out = renderToStaticMarkup(<GrantSection cls={{ ...held, record: { ...held.record!, gated: null }, gateSeen: null, since: '2026-09-20T08:00:00.000Z' }} policy={seven} proofClass="exploit-test" proofDemo={false} live />);
    expect([out.includes('Gate not seen since 2026-09-20'), out.includes('not recorded'), out.includes('>demo<')]).toEqual([true, true, false]);
    const human = renderToStaticMarkup(<GrantSection cls={{ ...held, tier: 'human_only', ceiling: 'human_only', record: null, gateSeen: null }} policy={seven} proofClass="" proofDemo={false} live />);
    expect(human).not.toContain('Gate');
  });
  it('the next rung\'s trial below the ceiling: its count (demo chipped), not recorded when unstated, no line at the ceiling', () => {
    const below: ClassRow = { ...held, ceiling: 'hands_off', record: { ...held.record!, trial: { n: 16, catches: 1 } } };
    const demo = renderToStaticMarkup(<GrantSection cls={below} policy={seven} proofClass="exploit-test" proofDemo={false} live={false} />);
    expect(demo).toMatch(/Trial at Hands-off.*16 resolved, 1 caught.*>demo</);
    const live = renderToStaticMarkup(<GrantSection cls={{ ...below, record: { ...below.record!, trial: null } }} policy={seven} proofClass="exploit-test" proofDemo={false} live />);
    expect(live).toMatch(/Trial at Hands-off.*not recorded/);
    expect(renderToStaticMarkup(<GrantSection cls={held} policy={seven} proofClass="exploit-test" proofDemo={false} live />)).not.toContain('Trial at');
  });
});

describe('the write sections', () => {
  const preview = {
    kind: 'promote-class', title: 'Promote qa.file-bug to hands_off', summary: 'Opens a policy MR as kazdanm.', risk: 'policy', previewId: 'p1', mode: 'live',
    commands: [{ display: 'glab api --method PUT projects/9/repository/files/tier-state.yml', argv: [], risk: 'policy' }],
    diff: ['-     qa.file-bug: { tier: supervised }', '+     qa.file-bug: { tier: hands_off, lease_expires: "2026-10-20T14:22:00.000Z" }'],
  } satisfies ActionPreview;

  it('the promote preview is headed as a policy MR a person merges, with its commands and lease_expires', () => {
    const out = renderToStaticMarkup(<WriteSection head={WRITE_HEAD.promote} keyName="p" to="hands_off" view={{ kind: 'preview', preview }} nothing="" />);
    expect(out).toContain('Promote · policy MR a person merges');
    expect(out).toContain('p → Hands-off');
    expect(out).toContain('The commands p runs');
    expect(out).toContain('lease_expires');
  });
  it('a sent promotion names the MR and links it; a demo answer says it was simulated, with no link', () => {
    const url = 'https://gitlab.com/acme-lab/belay-policy/-/merge_requests/22';
    const sent = renderToStaticMarkup(<WriteSection head={WRITE_HEAD.promote} keyName="p" to="hands_off" view={{ kind: 'sent', mr: '!22', url, simulated: false }} nothing="" />);
    expect(sent).toContain(`href="${url}"`);
    expect(sent).toContain('Open !22 ↗');
    const demo = renderToStaticMarkup(<WriteSection head={WRITE_HEAD.promote} keyName="p" to="hands_off" view={{ kind: 'sent', mr: null, url: null, simulated: true }} nothing="" />);
    expect(demo).toContain('Simulated · demo mode');
    expect(demo).not.toContain('href=');
  });
  it('the revoke is headed as a direct commit', () => {
    expect(renderToStaticMarkup(<WriteSection head={WRITE_HEAD.revoke} keyName="r" to={null} view={undefined} nothing="Nothing to revoke" />)).toContain('Revoke · direct commit');
  });
});
