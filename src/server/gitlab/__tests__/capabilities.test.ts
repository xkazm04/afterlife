import { describe, expect, it } from 'vitest';
import { classifyComponents, classifyEndpoint, classifyPlan, planName, probeCapabilities, type Capability } from '../capabilities';
import { GitLabError } from '../errors';
import { createFakeGitLab } from '../fake/fakeGitLab';
import type { GitLabPort } from '../port';

const byId = (caps: Capability[]) => Object.fromEntries(caps.map((c) => [c.id, c]));

describe('classification', () => {
  it('endpoint 200 is available', () => {
    expect(classifyEndpoint('x', null)).toMatchObject({ status: 'available', basis: 'endpoint' });
  });

  it('403 and 404 are unavailable, with the reason', () => {
    for (const [kind, status] of [['forbidden', 403], ['not-found', 404]] as const) {
      const v = classifyEndpoint('groups/1/audit_events', new GitLabError(kind, 'nope', 'x', status));
      expect(v.status).toBe('unavailable');
      expect(v.reason).toContain(String(status));
    }
  });

  it('network, auth, rate-limit and unexpected errors are unknown, never unavailable', () => {
    for (const kind of ['network', 'auth', 'rate-limited', 'api', 'parse', 'binary'] as const) {
      expect(classifyEndpoint('x', new GitLabError(kind, 'm', 'x')).status).toBe('unknown');
    }
    expect(classifyEndpoint('x', new Error('boom')).status).toBe('unknown');
  });

  it('plan names, including trials and legacy names', () => {
    expect(planName('ultimate_trial')).toBe('ultimate');
    expect(planName('gold')).toBe('ultimate');
    expect(planName('silver')).toBe('premium');
    expect(planName('free')).toBe('free');
    expect(planName('enterprise-x')).toBeNull();
    expect(planName(null)).toBeNull();
  });

  it('plan gating: below is unavailable, at or above is available, unreadable is unknown', () => {
    expect(classifyPlan('free', 'premium', 'x').status).toBe('unavailable');
    expect(classifyPlan('premium', 'premium', 'x').status).toBe('available');
    expect(classifyPlan('premium', 'ultimate', 'x').status).toBe('unavailable');
    expect(classifyPlan('ultimate', 'premium', 'x').status).toBe('available');
    expect(classifyPlan(null, 'premium', 'x').status).toBe('unknown');
  });

  it('CI components follow the instance version', () => {
    expect(classifyComponents('19.5.0-pre').status).toBe('available');
    expect(classifyComponents('16.11.2').status).toBe('unavailable');
    expect(classifyComponents(null).status).toBe('unknown');
    expect(classifyComponents('weird').status).toBe('unknown');
  });
});

describe('probeCapabilities', () => {
  it('Free group with no projects: what the real group answered on 2026-10-06', async () => {
    const r = await probeCapabilities(createFakeGitLab({ plan: 'free', projects: false }).port, 144060371);
    expect(r).toMatchObject({ plan: 'free', projectCount: 0, version: '19.5.0-pre' });
    const c = byId(r.capabilities);
    expect(c.merge_requests?.status).toBe('available');
    expect(c.releases?.status).toBe('available');
    expect(c.ci_components?.status).toBe('available');
    expect(c.service_accounts?.status).toBe('available');
    expect(c.pipelines).toMatchObject({ status: 'unknown', basis: 'none' });
    expect(c.custom_flows?.status).toBe('unknown');
    expect(c.audit_events).toMatchObject({ status: 'unavailable', basis: 'endpoint' });
    expect(c.flows_api?.status).toBe('unavailable');
    expect(c.deployment_approvals).toMatchObject({ status: 'unavailable', basis: 'plan' });
    expect(c.security_reports?.status).toBe('unavailable');
    expect(c.vulnerability_api).toMatchObject({ status: 'unavailable', basis: 'plan' });
  });

  it('Ultimate group with projects: probes the first project instead of the plan', async () => {
    const r = await probeCapabilities(createFakeGitLab({ plan: 'ultimate' }).port, 144060371);
    const c = byId(r.capabilities);
    expect(c.pipelines).toMatchObject({ status: 'available', basis: 'endpoint' });
    expect(c.vulnerability_api).toMatchObject({ status: 'available', basis: 'endpoint' });
    expect(c.audit_events?.status).toBe('available');
    expect(c.flows_api?.status).toBe('available');
    expect(c.deployment_approvals?.status).toBe('available');
    expect(c.security_reports?.status).toBe('available');
  });

  it('Free group with projects: the vulnerability endpoint 403 is unavailable', async () => {
    const c = byId((await probeCapabilities(createFakeGitLab({ plan: 'free' }).port, 144060371)).capabilities);
    expect(c.pipelines?.status).toBe('available');
    expect(c.vulnerability_api).toMatchObject({ status: 'unavailable', basis: 'endpoint' });
    expect(c.vulnerability_api?.reason).toContain('403');
  });

  it('a network failure makes every endpoint probe unknown, never unavailable', async () => {
    const fake = createFakeGitLab({ plan: 'free' }).port;
    const down: GitLabPort = {
      ...fake,
      get: async (path) => { throw new GitLabError('network', 'no such host', path); },
      getGroup: async (g) => { throw new GitLabError('network', 'no such host', String(g)); },
      getNamespace: async (g) => { throw new GitLabError('network', 'no such host', String(g)); },
      instance: async () => { throw new GitLabError('network', 'no such host', 'metadata'); },
      listProjects: async (g) => { throw new GitLabError('network', 'no such host', String(g)); },
    };
    const r = await probeCapabilities(down, 144060371);
    expect(r.plan).toBeNull();
    expect(r.capabilities.every((c) => c.status === 'unknown')).toBe(true);
  });
});
