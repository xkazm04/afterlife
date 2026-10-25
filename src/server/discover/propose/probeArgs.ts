// The args each probe kind takes, by name: a spec with an unknown kind, a missing required arg or an arg not named here
// is dropped, never run. Values are argv words for az, glab or git (no shell ever parses them), but they still may not
// carry a control character or a shell metacharacter: a proposal is model output, and nothing in it is trusted.
import { PROBE_KINDS, type ProbeKind, type ProbeSpec } from '@/schemas/vitals';

interface ArgSpec {
  required: readonly string[];
  optional: readonly string[];
}

/** WP2's and WP4's arg names (providers/azure, providers/gitlab); git and local are discover's own. */
export const PROBE_ARGS: Record<ProbeKind, ArgSpec> = {
  'git-root': { required: [], optional: ['path'] },
  'git-remote': { required: [], optional: ['path'] },
  'az-login': { required: [], optional: ['subscription'] },
  'az-devops-pipelines': { required: ['org', 'project'], optional: [] },
  'az-devops-runs': { required: ['org', 'project', 'pipelineId'], optional: [] },
  'az-devops-timeline': { required: ['org', 'project', 'runId'], optional: [] },
  'az-appinsights-component': { required: ['resourceGroup'], optional: ['subscription', 'name'] },
  'az-appinsights-query': { required: ['appId'], optional: [] },
  'az-loganalytics-workspace': { required: ['resourceGroup'], optional: ['subscription', 'name'] },
  'az-loganalytics-query': { required: ['workspaceId'], optional: ['site', 'subscription'] },
  'glab-auth': { required: [], optional: [] },
  'glab-pipelines': { required: ['path'], optional: [] },
  'glab-jobs': { required: ['path', 'pipelineId'], optional: [] },
  'local-command': { required: ['command'], optional: ['path'] },
};

const KINDS: readonly string[] = PROBE_KINDS;
const BAD_VALUE = /[\u0000-\u001f\u007f"`$;&|<>]/;
const ID = /^\d{1,12}$/;

/** The providers take an Azure DevOps org as its URL (providers/azure/args); a bare name is that URL. */
export const orgUrl = (org: string): string => (/^https?:\/\//i.test(org) ? org.replace(/\/+$/, '') : `https://dev.azure.com/${org}`);

const relPathOk = (v: string): boolean => !/^([a-z]:|[\\/])/i.test(v) && !v.split(/[\\/]/).includes('..');

function valueOk(kind: ProbeKind, name: string, v: string): boolean {
  if (!v || v.length > 300 || BAD_VALUE.test(v)) return false;
  if ((name === 'pipelineId' || name === 'runId') && !ID.test(v)) return false;
  if (name === 'path' && (kind.startsWith('git') || kind === 'local-command')) return relPathOk(v);
  if (name === 'path') return /^[A-Za-z0-9_.\-/]+$/.test(v);
  return true;
}

/** A clean spec, or null when the kind is unknown or any arg is missing, unnamed or not a safe value. */
export function cleanSpec(raw: unknown): ProbeSpec | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { kind, args } = raw as { kind?: unknown; args?: unknown };
  if (typeof kind !== 'string' || !KINDS.includes(kind)) return null;
  const k = kind as ProbeKind;
  const spec = PROBE_ARGS[k];
  const a = args === undefined ? {} : args;
  if (typeof a !== 'object' || a === null || Array.isArray(a)) return null;
  const out: Record<string, string> = {};
  for (const [name, v] of Object.entries(a)) {
    if (!spec.required.includes(name) && !spec.optional.includes(name)) return null;
    const s = typeof v === 'number' && Number.isFinite(v) ? String(v) : v;
    if (typeof s !== 'string' || !valueOk(k, name, s.trim())) return null;
    out[name] = name === 'org' && k.startsWith('az-devops') ? orgUrl(s.trim()) : s.trim();
  }
  if (!spec.required.every((r) => r in out)) return null;
  return { kind: k, args: out };
}

export const specKey = (s: ProbeSpec): string => `${s.kind}|${Object.keys(s.args).sort().map((k) => `${k}=${s.args[k]}`).join('&')}`;
