// Every wizard state renders: no Claude Code history, a repo already onboarded, proposing, claude missing, an invalid
// proposal, a probe that failed with its re-login command, the confirmed checklist with its engine footer, and saved.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ClaudeRepo, ProbeResult, Proposal } from '@/schemas/vitals';
import type { ProposeAnswer } from '@/server/discover/wire';
import { FoundStep } from './components/FoundStep';
import { RepoStep } from './components/RepoStep';
import { SaveStep } from './components/SaveStep';
import { WizardStatus } from './components/WizardChrome';
import type { WizardState } from './hooks/useWizard';

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);
const noop = () => {};
const NOW = Date.parse('2026-10-25T09:00:00.000Z');

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
const ANSWER: ProposeAnswer = { root: 'C:/Users/x/refactoring', proposal: PROPOSAL, ms: 10_500, engine: { model: 'claude-sonnet-5-5', effort: 'low' }, dropped: 1, ciFiles: ['azure-pipelines.yml', 'pipelines/nightly-full.yml', 'pipelines/pr-validation.yml'] };
const r = (kind: ProbeResult['kind'], status: ProbeResult['status'], summary: string, data?: Record<string, string>) => ({ result: { kind, args: {}, status, summary, at: 'x', ms: 1, ...(data ? { data } : {}) }, seal: 's' });

const state = (s: Partial<WizardState>): WizardState => ({ phase: 'pick', engine: 'sonnet', results: [], running: null, elapsedS: 0, ...s });
const found = (s: WizardState) => html(createElement(FoundStep, { s, onRerun: noop, onCopy: noop }));

describe('Onboard wizard states', () => {
  it('no Claude Code history: only the path field', () => {
    const out = html(createElement(RepoStep, { repos: [], busy: false, now: NOW, onPick: noop }));
    expect(out).toContain('No Claude Code history here');
    expect(out).toContain('Use this path');
    expect(out).not.toContain('Pick</button>');
  });

  it('the repo list: an onboarded repo opens its Vitals or re-runs, another is picked', () => {
    const out = html(createElement(RepoStep, { repos: REPOS, busy: false, now: NOW, onPick: noop }));
    expect(out).toContain('2 with Claude Code history');
    expect(out).toContain('Onboarded');
    expect(out).toContain('href="/vitals/grinex-portal"');
    expect(out).toContain('Re-run');
    expect(out).toContain('Pick');
    expect(out).toContain('Azure DevOps');
    expect(out).toContain('4 min ago');
    expect(out).toContain('master');
  });

  it('proposing: the checklist groups with a dash each, no skeleton bars, and the elapsed seconds', () => {
    const out = found(state({ phase: 'proposing', picked: 'C:/Users/x/refactoring', elapsedS: 12 }));
    expect(out).toContain('aria-busy="true"');
    for (const g of ['Host', 'Components', 'Pipelines &amp; variants', 'Cloud']) expect(out).toContain(`aria-label="${g}: not proposed yet"`);
    expect(out).not.toMatch(/skeleton|shimmer/i);
    expect(out).toContain('sonnet 5.5 · low · 12 s');
  });

  it('claude missing, and an invalid proposal, each say what to do', () => {
    expect(found(state({ error: { code: 'claude-missing', error: 'claude is not on PATH' } }))).toContain('The claude binary was not found');
    const invalid = found(state({ error: { code: 'invalid', error: 'the proposal names no project' } }));
    expect(invalid).toContain('The proposal was invalid');
    expect(invalid).toContain('the proposal names no project');
    expect(invalid).toContain('Re-run');
  });

  it('a probe fail shows its summary and a copyable re-login; a confirmed line reads ok; the footer names the engine', () => {
    const results = [r('git-remote', 'ok', 'azure-devops · Grinex / Grinex Portal'), r('git-root', 'ok', 'release-log is in the repo'), r('az-devops-pipelines', 'fail', 'AADSTS70043: the refresh token has expired. Run az login'), undefined];
    const s = state({ phase: 'probing', answer: ANSWER, results, running: 3 });
    const out = found(s);
    for (const g of ['Host', 'Components', 'Pipelines &amp; variants', 'Cloud']) expect(out).toContain(`>${g}</h3>`);
    expect(out).toContain('AADSTS70043');
    expect(out).toContain('<code>az login</code>');
    expect(out).toContain('Copy');
    expect(out).toContain('master-hotfix');
    expect(out).toContain('branch master · LANE=hotfix');
    expect(out).toContain('probing');
    expect(out).toContain('2 of 5 confirmed');
    expect(out).toContain('sonnet 5.5 · low · 11 s · 1 proposed probe dropped');
    expect(html(createElement(WizardStatus, { repos: REPOS, s }))).toContain('2 repos · 1 onboarded · Grinex Portal: 2 of 5 confirmed · sonnet 5.5 · low · 11 s');
  });

  it('findings: CI files that never ran, and a cloud with no component as a person step that spells no command', () => {
    const extra = { ...ANSWER, proposal: { ...PROPOSAL, ci: { ...PROPOSAL.ci, pipelines: [...PROPOSAL.ci.pipelines, { id: '9', name: 'Mystery' }] } } };
    const results = [r('git-remote', 'ok', 'x'), r('git-root', 'ok', 'y'), r('az-devops-pipelines', 'ok', '6 pipelines', { pipelineIds: '2,4' }), r('az-appinsights-component', 'fail', 'no App Insights component visible to this login')];
    const s = state({ phase: 'review', answer: extra, results });
    const out = found(s);
    expect(out).toContain('pipelines/pr-validation.yml');
    expect(out).toContain('pipelines/nightly-full.yml');
    expect(out.match(/defined in the repo, never ran/g)).toHaveLength(2);
    expect(out).toContain('never ran');
    expect(out).toContain('not among the pipelines listed (2, 4)');
    expect(out).toContain('Turn on App Insights');
    expect(out).toContain('your step');
    expect(out).toContain('your step: after Save');
    expect(out).not.toContain('az monitor app-insights component create'); // the server previews it after Save (enable-app-insights)
    // Findings are not lines to save: host, component, pipeline 2 and its variant confirmed; Mystery and the cloud failed.
    expect(html(createElement(SaveStep, { s, onSave: noop, onRerun: noop }))).toContain('4 of 6 lines confirmed, 2 failed');
  });

  it('a lapsed login on the component probe is a re-login, never "turn on App Insights"', () => {
    const results = [undefined, undefined, undefined, r('az-appinsights-component', 'fail', 'AADSTS700082: expired. Run az login')];
    expect(found(state({ phase: 'probing', answer: ANSWER, results, running: null }))).not.toContain('Turn on App Insights');
  });

  it('review: Save keeps only the confirmed lines; saved: a link to its Vitals', () => {
    const results = [r('git-remote', 'ok', 'x'), r('git-root', 'ok', 'y'), r('az-devops-pipelines', 'ok', '6 pipelines', { pipelineIds: '2,4' }), r('az-appinsights-component', 'ok', 'found', { appId: 'a' })];
    const review = html(createElement(SaveStep, { s: state({ phase: 'review', answer: ANSWER, results }), onSave: noop, onRerun: noop }));
    expect(review).toContain('5 of 5 lines confirmed. Only the 5 are saved');
    expect(review).toContain('Save and collect');
    const out = found(state({ phase: 'review', answer: ANSWER, results }));
    expect(out).not.toContain('Turn on App Insights');
    expect(out).not.toContain('not among the pipelines listed');
    const saved = html(createElement(SaveStep, { s: state({ phase: 'saved', answer: ANSWER, results, slug: 'grinex-portal' }), onSave: noop, onRerun: noop }));
    expect(saved).toContain('Saved as <code>grinex-portal</code>');
    expect(saved).toContain('href="/vitals/grinex-portal"');
  });
});
