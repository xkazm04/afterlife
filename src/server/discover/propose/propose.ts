// The hybrid engine: deterministic code collects the facts, ONE headless claude call (no tools: the facts are the whole
// input) decides what to watch, and parseProposal keeps only what fits the contract. The call runs from a fresh temp
// dir, not the repo: the repo's own .claude settings and hooks must not run under the wizard, and the temp path is
// one listClaudeRepos drops. The proposal then gets the probes that confirm each of its lines (completeProbes).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Engine, ProbeSpec, Proposal } from '@/schemas/vitals';
import { callClaude, removeScratch, type AgentCall, type AgentOutcome } from '../../../../runner/agent/spawn';
import { collectFacts, factsJson, type Facts } from '../facts/facts';
import { runProbe } from '../probes/run';
import { parseRemote } from '../repos/remote';
import { ProposalError, parseProposal } from './proposal';
import { cleanSpec, specKey } from './probeArgs';

export const PROPOSE_TIMEOUT_MS = 4 * 60 * 1000;

/** claude is not on PATH (or AFTERLIFE_CLAUDE_BIN names nothing): the wizard says how to install it. */
export class ClaudeMissingError extends Error {}

export type Call = (call: AgentCall) => Promise<AgentOutcome>;

/** The onboarding prompt: src/server/discover/prompt.md, read from the app root on every call. */
export function loadPrompt(): string {
  const file = path.join(process.cwd(), 'src', 'server', 'discover', 'prompt.md');
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    throw new Error(`discover: the onboarding prompt is missing (${path.relative(process.cwd(), file)})`);
  }
}

/** The one JSON object in the model's answer: a ```json fence or bare text, from the first `{` to the last `}`. */
export function jsonOf(text: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text)?.[1] ?? text;
  const a = fenced.indexOf('{');
  const b = fenced.lastIndexOf('}');
  if (a < 0 || b <= a) throw new ProposalError('the model answered with no JSON object');
  try {
    return JSON.parse(fenced.slice(a, b + 1));
  } catch (e) {
    throw new ProposalError(`the model's JSON does not parse: ${e instanceof Error ? e.message : String(e)}`);
  }
}

const MISSING = /not recognized as an internal or external command|ENOENT|command not found|cannot find the path|is not recognized/i;

/** Each line's confirming probe, added where the model left it out: git first, then CI, then cloud, then the model's own. */
export function completeProbes(p: Proposal): ProbeSpec[] {
  const want: ProbeSpec[] = [{ kind: 'git-root', args: {} }, { kind: 'git-remote', args: {} }];
  for (const c of p.components) if (c.path !== '.') want.push({ kind: 'git-root', args: { path: c.path } });
  const { org, project, path: glPath } = p.host;
  if (p.ci.provider === 'azure-pipelines' && org && project && p.ci.pipelines.length) want.push({ kind: 'az-devops-pipelines', args: { org, project } });
  if (p.ci.provider === 'gitlab-ci' && glPath && p.ci.pipelines.length) want.push({ kind: 'glab-pipelines', args: { path: glPath } });
  const rg = p.cloud.hint?.resourceGroup;
  if (p.cloud.provider === 'azure-app-insights' && rg && !p.probes.some((s) => s.kind === 'az-appinsights-component')) {
    want.push({ kind: 'az-appinsights-component', args: p.cloud.hint?.name ? { resourceGroup: rg, name: p.cloud.hint.name } : { resourceGroup: rg } });
  }
  const seen = new Set<string>();
  // Through cleanSpec, so a spec added here reads as the model's would (an org becomes its URL) and dedupes against it.
  return [...want.map(cleanSpec).filter((s): s is ProbeSpec => !!s), ...p.probes].filter((s) => !seen.has(specKey(s)) && !!seen.add(specKey(s)));
}

/**
 * Azure pipeline ids are not in any file, so the pipelines probe runs once before the call (a prepared, read-only probe)
 * and the model is told what it listed. A probe that fails (a lapsed login, the stub before WP2) adds nothing.
 */
export async function withPipelines(facts: Facts, probe: typeof runProbe = runProbe): Promise<Facts> {
  const host = facts.remote ? parseRemote(facts.remote) : undefined;
  const spec: ProbeSpec | undefined =
    host?.kind === 'azure-devops' && host.org && host.project ? { kind: 'az-devops-pipelines', args: { org: host.org, project: host.project } }
      : host?.kind === 'gitlab' && host.path ? { kind: 'glab-pipelines', args: { path: host.path } }
        : undefined;
  if (!spec) return facts;
  const r = await probe(spec, facts.root);
  return r.status === 'ok' ? { ...facts, pipelines: { summary: r.summary, ...(r.data ? { data: r.data } : {}) } } : facts;
}

export async function proposeWith(root: string, engine: Engine, call: Call = callClaude, probe: typeof runProbe = runProbe): Promise<{ proposal: Proposal; ms: number; engine: Engine; dropped: number }> {
  const t0 = Date.now();
  const facts = factsJson(await withPipelines(await collectFacts(root), probe));
  const prompt = `${loadPrompt()}\n\n## Facts\n\n\`\`\`json\n${facts}\n\`\`\`\n`;
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'afterlife-onboard-'));
  let out: AgentOutcome;
  try {
    out = await call({ prompt, cwd, model: engine.model, effort: engine.effort, timeoutMs: PROPOSE_TIMEOUT_MS, permissions: { step: 'reflect' } });
  } finally {
    removeScratch(cwd);
  }
  if (out.timedOut) throw new Error(`claude did not answer within ${PROPOSE_TIMEOUT_MS / 60_000} min`);
  if (out.exitCode !== 0 && !out.text && MISSING.test(out.stderr)) throw new ClaudeMissingError('claude is not on PATH: install Claude Code and log in (claude), or set AFTERLIFE_CLAUDE_BIN');
  if (out.isError || out.exitCode !== 0) throw new Error(`claude failed (exit ${out.exitCode}): ${(out.stderr || out.text).trim().split('\n')[0] ?? ''}`);
  const { proposal, dropped } = parseProposal(jsonOf(out.text));
  return { proposal: { ...proposal, probes: completeProbes(proposal) }, ms: Date.now() - t0, engine, dropped };
}
