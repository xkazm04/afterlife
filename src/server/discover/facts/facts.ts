// Everything the proposing model is told about a repo, collected deterministically in well under a second: no model
// call reads the tree, so a low-effort engine decides from the same facts every time. The JSON is capped at ~25 KB,
// cut from the least decisive part first (infra lines, then component scripts, then CI blocks).
import { gitOut } from '../repos/git';
import { scrubRemote } from '../repos/remote';
import { ciFacts, ciFiles, type CiFileFacts } from './ci';
import { infraHints } from './infra';
import { componentDirs, manifests, type DirFacts, type Manifests } from './repo';

export const FACTS_CAP = 25 * 1024;

export interface Facts {
  root: string;
  remote?: string;
  defaultBranch?: string;
  ci: CiFileFacts[];
  manifests: Manifests;
  dirs: DirFacts[];
  infra: string[];
  /** What the pipelines probe listed before the model was asked (propose/withPipelines). */
  pipelines?: { summary: string; data?: Record<string, string> };
}

export async function collectFacts(root: string): Promise<Facts> {
  const [remote, head] = await Promise.all([gitOut(root, ['remote', 'get-url', 'origin']), gitOut(root, ['symbolic-ref', 'refs/remotes/origin/HEAD'])]);
  const ci: CiFileFacts[] = [];
  for (const f of ciFiles(root)) {
    try {
      ci.push(ciFacts(root, f));
    } catch {
      /* unreadable: left out */
    }
  }
  const facts: Facts = { root: root.replace(/\\/g, '/'), ci, manifests: manifests(root), dirs: componentDirs(root), infra: infraHints(root) };
  if (remote) facts.remote = scrubRemote(remote);
  if (head) facts.defaultBranch = head.replace(/^refs\/remotes\/origin\//, '');
  return facts;
}

const size = (f: Facts): number => Buffer.byteLength(JSON.stringify(f));

/** The facts as compact JSON, cut until it fits `cap`. */
export function factsJson(facts: Facts, cap = FACTS_CAP): string {
  let f: Facts = structuredClone(facts);
  const cuts: ((x: Facts) => Facts)[] = [
    (x) => ({ ...x, infra: x.infra.slice(0, 15) }),
    (x) => ({ ...x, dirs: x.dirs.map(({ packageScripts: _s, ...d }) => (void _s, d)) }),
    (x) => ({ ...x, ci: x.ci.map((c) => ({ ...c, blocks: Object.fromEntries(Object.entries(c.blocks).map(([k, v]) => [k, v.split('\n').slice(0, 12).join('\n')])) })) }),
    (x) => ({ ...x, manifests: { ...x.manifests, packageScripts: Object.fromEntries(Object.entries(x.manifests.packageScripts ?? {}).slice(0, 12)) } }),
    (x) => ({ ...x, dirs: x.dirs.slice(0, 15), ci: x.ci.slice(0, 15) }),
  ];
  for (const cut of cuts) {
    if (size(f) <= cap) break;
    f = cut(f);
  }
  const out = JSON.stringify(f);
  return Buffer.byteLength(out) <= cap ? out : out.slice(0, cap);
}
