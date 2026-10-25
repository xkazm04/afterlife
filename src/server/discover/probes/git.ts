// The two probes discover answers itself. git-root: the path (the root, or a component's path under it) is inside this
// git toplevel. git-remote: the origin remote, with what it says about the host - the confirm step saves the host
// from this probe's data, never from the model's guess.
import { realpathSync } from 'node:fs';
import path from 'node:path';
import type { ProbeResult, ProbeSpec } from '@/schemas/vitals';
import { gitOut, rootKey } from '../repos/git';
import { parseRemote } from '../repos/remote';

type Done = Pick<ProbeResult, 'status' | 'summary' | 'data'>;

/** Compared through realpath: git names a toplevel resolved (a long name for an 8.3 one, /private/var for /var). */
const same = (a: string, b: string): boolean => {
  const real = (p: string) => {
    try {
      return realpathSync.native(p);
    } catch {
      return p;
    }
  };
  return rootKey(real(a)) === rootKey(real(b));
};

export async function gitRoot(spec: ProbeSpec, root: string): Promise<Done> {
  const at = spec.args.path ? path.join(root, spec.args.path) : root;
  const top = await gitOut(at, ['rev-parse', '--show-toplevel']);
  if (!top) return { status: 'fail', summary: spec.args.path ? `${spec.args.path} is not a folder in this repo` : 'not a git repository' };
  if (!same(top, root)) return { status: 'fail', summary: `${spec.args.path ?? '.'} belongs to another repo (${top})` };
  return { status: 'ok', summary: spec.args.path ? `${spec.args.path} is in the repo` : top, data: { root: top } };
}

export async function gitRemote(spec: ProbeSpec, root: string): Promise<Done> {
  const at = spec.args.path ? path.join(root, spec.args.path) : root;
  const raw = await gitOut(at, ['remote', 'get-url', 'origin']);
  if (!raw) return { status: 'fail', summary: 'no origin remote' };
  const r = parseRemote(raw);
  const data: Record<string, string> = { remote: r.url, hostKind: r.kind };
  for (const k of ['org', 'project', 'repo', 'path'] as const) if (r[k]) data[k] = r[k];
  const where = r.kind === 'azure-devops' ? [r.org, r.project, r.repo].filter(Boolean).join(' / ') : r.path ?? r.url;
  return { status: 'ok', summary: `${r.kind} · ${where}`, data };
}
