// A count row of the promotion rule opens on the outputs behind it: the MRs it counted (a GitLab link when the poll knew
// the project's web URL), the ones it left out and why, and the facts not read. Row and list read the same record.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DEMO } from '@/lib/demo';
import { promotion, type PromotionRule as Rule } from '@/lib/promotion';
import { repoPolicy } from '@/server/data/policy';
import type { CountedTask } from '@/server/poller/derive/counters';
import { recordOf } from '@/server/poller/derive/sources';
import { PromotionRule } from './PromotionRule';
import { RuleRow } from './RuleRow';

const NOW = new Date('2026-10-06T14:22:00Z');
const ago = (days: number) => new Date(NOW.getTime() - days * 86_400_000);
const task = (iid: number, state: CountedTask['state'], days: number, edited?: boolean): CountedTask => ({
  agent: 'ai-patcher-acme-lab', actionClass: 'code-fix.patch', state, stateLabel: state, startedAt: ago(days + 0.5),
  finishedAt: state === 'merged' ? ago(days) : null, mrIid: iid, detail: edited === undefined ? {} : { edited },
});

/** Seven outputs, the last five counted (window_last 5): !103, !105, !107 merged, !104 closed, !106 blocked; !105 states no edit fact. */
const { counters, sources } = recordOf({
  tasks: [task(101, 'merged', 7, false), task(102, 'merged', 6, false), task(103, 'merged', 5, false), task(104, 'closed', 4), task(105, 'merged', 3), task(106, 'blocked', 2), task(107, 'merged', 1, false)],
  events: [], revertDemotes: true, ledgerRead: true, web: 'https://gitlab.example/acme/ledgerline',
}, { agent: 'ai-patcher-acme-lab', classId: 'code-fix.patch', since: ago(10), window: 5 }, NOW);

const p = promotion({ tier: 'assisted', ceiling: 'hands_off', record: counters }, 'exploit-test', repoPolicy(), NOW);
const rules: Rule[] = p.kind === 'notyet' || p.kind === 'eligible' ? p.rules : [];
const rule = (name: string): Rule => rules.find((r) => r.name === name) ?? { name, value: '', met: false };
const list = (html: string, label: string): string[] => [...(html.match(new RegExp(`<ul[^>]*aria-label="${label}"[^>]*>(.*?)</ul>`))?.[1] ?? '').matchAll(/>!(\d+)</g)].map((m) => `!${m[1]}`);

describe('the outputs behind a count, on its row', () => {
  it('each count row (all of them, to Supervised) is a collapsed button, and nothing is listed yet', () => {
    const html = renderToStaticMarkup(<PromotionRule promotion={p} uncounted={false} proofDemo={false} sources={sources} />);
    expect(html.match(/<button[^>]*aria-expanded="false"/g)).toHaveLength(rules.length);
    expect(html).toContain('3 / 5');
    expect(html).not.toContain('Counted (');
  });

  it('the accepted row reads 3 / 5 and expands to exactly !107, !105 and !103, each a GitLab link; the earlier two are excluded', () => {
    const html = renderToStaticMarkup(<RuleRow rule={rule('accepted outputs')} sources={sources} defaultOpen />);
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('3 / 5');
    expect(list(html, 'Counted')).toEqual(['!107', '!105', '!103']);
    expect(html).toContain('href="https://gitlab.example/acme/ledgerline/-/merge_requests/107"');
    expect(list(html, 'Not counted')).toEqual(['!106', '!104', '!102', '!101']);
    expect(html).toContain('merged, outside the window (last 5)');
  });

  it('merged without edits is not recorded, and its list names the MR with no edit fact', () => {
    const name = 'merged without edits ≥ 90 %';
    const html = renderToStaticMarkup(<RuleRow rule={{ name, value: 'not recorded', met: false }} sources={sources} defaultOpen />);
    expect(list(html, 'Not read')).toEqual(['!105']);
    expect(html).toContain('no edit fact read yet');
  });

  it('demo: a class\'s illustrative outputs are plain !iids, chipped demo', () => {
    const c = DEMO.actionClasses.find((a) => a.id === 'code-fix.patch');
    const html = renderToStaticMarkup(<RuleRow rule={{ name: 'gated outputs', value: '3 / 6', met: false }} sources={c?.sources} defaultOpen />);
    expect(list(html, 'Counted')).toHaveLength(3);
    expect(list(html, 'Not read')).toHaveLength(3);
    expect(html).not.toContain('href=');
    expect(html).toContain('>demo<');
  });
});
