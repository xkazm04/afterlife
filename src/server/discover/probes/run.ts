// Runs probe specs one after another, in order, and never throws for one: a spec that does not validate, a provider
// that throws (the stubs do until WP2 and WP4 land) or a lapsed login is a `fail` line with its reason. A local
// command never runs here: it runs on the person's click (v1).
import type { ProbeResult, ProbeSpec } from '@/schemas/vitals';
import { ciProvider, cloudProvider, probeOwner } from '@/server/providers/registry';
import { messageOf } from '@/lib/format/error';
import { cleanSpec } from '../propose/probeArgs';
import { gitRemote, gitRoot } from './git';

export interface ProbeDeps {
  ci: typeof ciProvider;
  cloud: typeof cloudProvider;
  now: () => Date;
}

const DEPS: ProbeDeps = { ci: ciProvider, cloud: cloudProvider, now: () => new Date() };

type Done = Pick<ProbeResult, 'status' | 'summary' | 'data'>;

async function answer(spec: ProbeSpec, root: string, deps: ProbeDeps): Promise<Done | ProbeResult> {
  if (spec.kind === 'git-root') return gitRoot(spec, root);
  if (spec.kind === 'git-remote') return gitRemote(spec, root);
  if (spec.kind === 'local-command') return { status: 'skipped', summary: 'runs on your click' };
  const owner = probeOwner(spec.kind);
  if (owner === 'azure-pipelines' || owner === 'gitlab-ci') return deps.ci(owner).probe(spec);
  if (owner === 'azure-app-insights') return deps.cloud(owner).probe(spec);
  return { status: 'fail', summary: `no probe answers ${spec.kind}` };
}

export async function runProbe(raw: ProbeSpec, root: string, deps: ProbeDeps = DEPS): Promise<ProbeResult> {
  const t0 = Date.now();
  const spec = cleanSpec(raw);
  let done: Done | ProbeResult;
  if (!spec) done = { status: 'fail', summary: `refused: ${String(raw?.kind)} with these args is not a probe Afterlife runs` };
  else {
    try {
      done = await answer(spec, root, deps);
    } catch (e) {
      done = { status: 'fail', summary: messageOf(e, { firstLine: true }) };
    }
  }
  // The provider's own kind, args, at and ms are not trusted over the spec that was asked: the line is the spec's.
  const out: ProbeResult = { kind: spec?.kind ?? raw.kind, args: spec?.args ?? {}, status: done.status, summary: done.summary, at: deps.now().toISOString(), ms: Date.now() - t0 };
  if (done.data && Object.keys(done.data).length) out.data = done.data;
  return out;
}

export async function runProbesWith(specs: ProbeSpec[], root: string, deps: ProbeDeps = DEPS): Promise<ProbeResult[]> {
  const out: ProbeResult[] = [];
  for (const s of specs) out.push(await runProbe(s, root, deps));
  return out;
}
