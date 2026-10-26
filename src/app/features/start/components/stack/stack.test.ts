// The repo and stack steps' content renders in every state (moved from the onboard wizard's render test): no Claude Code
// history, a repo already onboarded, proposing, claude missing, a probe that failed with its re-login command, the
// findings, and the checklist with its engine footer. The lines come from model/stack/lines (checklist, tally).
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { ClaudeRepo, ProbeResult, Proposal } from '@/schemas/vitals';
import { checklist, tally } from '../../model/stack/lines';
import type { StackView } from '../../model/view';

vi.mock('next/link', () => ({ default: (p: { href: string; children: unknown }) => createElement('a', { href: p.href }, p.children as never) }));
const { RepoPicker } = await import('./RepoPicker');
const { StackList } = await import('./StackList');

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);
const noop = () => {};

const REPOS: ClaudeRepo[] = [
  { root: 'C:/Users/x/refactoring', name: 'Grinex Portal', lastUsed: '2026-10-25T08:56:00.000Z', branch: 'master', hostKind: 'azure-devops', onboarded: 'grinex-portal' },
  { root: 'C:/Users/x/afterlife', name: 'afterlife', lastUsed: '2026-10-24T09:00:00.000Z', hostKind: 'none' },
];

const PROPOSAL: Proposal = {
  name: 'Grinex Portal',
  host: { kind: 'azure-devops', org: 'Grinex', project: 'Grinex Portal' },
  components: [{ id: 'release-log', path: 'release-log', stack: 'python', tests: ['pytest release-log'] }],
  ci: { provider: 'azure-pipelines', pipelines: [{ id: '2', name: 'Grinex Portal', file: 'azure-pipelines.yml' }], variants: [{ id: 'master-hotfix', pipelineId: '2', match: { branch: 'master', parameter: { name: 'LANE', value: 'hotfix' } } }] },
  cloud: { provider: 'azure-app-insights', hint: { resourceGroup: 'grinex-portal-resource-group' } },
  metrics: [],
  probes: [
    { kind: 'git-remote', args: {} },
    { kind: 'git-root', args: { path: 'release-log' } },
    { kind: 'az-devops-pipelines', args: { org: 'Grinex', project: 'Grinex Portal' } },
    { kind: 'az-appinsights-component', args: { resourceGroup: 'grinex-portal-resource-group' } },
  ],
};
const CI = ['azure-pipelines.yml', 'pipelines/nightly-full.yml', 'pipelines/pr-validation.yml'];
const r = (kind: ProbeResult['kind'], status: ProbeResult['status'], summary: string, data?: Record<string, string>): ProbeResult => ({ kind, args: {}, status, summary, at: 'x', ms: 1, ...(data ? { data } : {}) });

function stack(over: Partial<StackView> & { results?: (ProbeResult | undefined)[]; running?: number | null; proposal?: Proposal } = {}): StackView {
  const groups = over.results ? checklist(over.proposal ?? PROPOSAL, over.results, over.running ?? null, CI) : [];
  return { groups, tally: tally(groups), phase: 'review', rerun: noop, save: noop, ...over };
}

describe('the repo step', () => {
  it('no Claude Code history: only the path field', () => {
    const out = html(createElement(RepoPicker, { repo: { repos: [], pick: noop } }));
    expect(out).toContain('No Claude Code history names a repo here');
    expect(out).toContain('Use this path');
    expect(out).not.toContain('Pick</button>');
  });
  it('the repo list: an onboarded repo opens its Vitals or re-runs, another is picked', () => {
    const out = html(createElement(RepoPicker, { repo: { repos: REPOS, pick: noop } }));
    for (const s of ['Onboarded', 'href="/vitals/grinex-portal"', 'Re-run', 'Pick', 'Azure DevOps', 'master']) expect(out).toContain(s);
  });
});

describe('the stack step', () => {
  it('proposing: the skeleton, no lines yet', () => {
    const out = html(createElement(StackList, { stack: stack({ phase: 'proposing' }), onCopy: noop }));
    expect(out).toContain('aria-hidden="true"');
    expect(out).not.toContain('<h3');
  });
  it('claude missing: the check command and Re-run', () => {
    const out = html(createElement(StackList, { stack: stack({ phase: 'pick', error: { code: 'claude-missing', error: 'claude is not on PATH' } }), onCopy: noop }));
    expect(out).toContain('claude --version');
    expect(out).toContain('Re-run');
  });
  it('a probe fail shows its summary and a copyable re-login; the footer names the engine and the tally', () => {
    const results = [r('git-remote', 'ok', 'azure-devops · Grinex / Grinex Portal'), r('git-root', 'ok', 'release-log is in the repo'), r('az-devops-pipelines', 'fail', 'AADSTS70043: the refresh token has expired. Run az login'), undefined];
    const out = html(createElement(StackList, { stack: stack({ phase: 'probing', results, running: 3, engine: 'sonnet 5.5 · low · 11 s' }), onCopy: noop }));
    for (const g of ['Host', 'Components', 'Pipelines &amp; variants', 'Cloud']) expect(out).toContain(`>${g}</h3>`);
    for (const s of ['AADSTS70043', '<code>az login</code>', 'master-hotfix', 'branch master · LANE=hotfix', 'probing', 'sonnet 5.5 · low · 11 s · 2 of 5 confirmed']) expect(out).toContain(s);
  });
  it('findings: CI files that never ran, and a cloud with no component as a person step that spells no command', () => {
    const extra = { ...PROPOSAL, ci: { ...PROPOSAL.ci, pipelines: [...PROPOSAL.ci.pipelines, { id: '9', name: 'Mystery' }] } };
    const results = [r('git-remote', 'ok', 'x'), r('git-root', 'ok', 'y'), r('az-devops-pipelines', 'ok', '6 pipelines', { pipelineIds: '2,4' }), r('az-appinsights-component', 'fail', 'no App Insights component visible to this login')];
    const s = stack({ proposal: extra, results });
    const out = html(createElement(StackList, { stack: s, onCopy: noop }));
    expect(out.match(/defined in the repo, never ran/g)).toHaveLength(2);
    expect(out).toContain('not among the pipelines listed (2, 4)');
    expect(out).toContain('your step: after Save');
    expect(out).not.toContain('az monitor app-insights component create');
    expect(s.tally).toEqual({ saved: 4, total: 6, failed: 2 });
  });
});
