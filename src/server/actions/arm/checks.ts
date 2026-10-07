// What the target's pipeline must already be for an arm block to work in it, read from the file as YAML. Each check that
// fails is a refusal the screen shows: Belay does not add a stage, rewrite an include or add a component twice.
import { parse } from 'yaml';
import type { Include, TrackArm } from './content';

/** GitLab's stages when a pipeline declares none (docs.gitlab.com/ci/yaml/#stages). */
const DEFAULT_STAGES = ['.pre', 'build', 'test', 'deploy', '.post'];

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);

function load(text: string): Rec | string {
  try {
    const doc: unknown = parse(text);
    return isRec(doc) ? doc : doc == null ? {} : 'it is not a mapping';
  } catch (e) {
    return e instanceof Error ? e.message.split('\n')[0] ?? 'it does not parse' : 'it does not parse';
  }
}

const includesOf = (doc: Rec): Rec[] => {
  const inc = doc.include;
  return (Array.isArray(inc) ? inc : inc === undefined ? [] : [inc]).filter(isRec);
};

/** An include that is the same component (and, for proof-engine, the same class) as one the block would add. */
function same(have: Rec, want: Include): boolean {
  if (typeof have.component !== 'string' || !have.component.includes(`/belay-pack/${want.component}@`)) return false;
  const cls = want.inputs.find(([k]) => k === 'class')?.[1];
  return cls === undefined || (isRec(have.inputs) && have.inputs.class === cls);
}

/** Null when the block can go in; else what is in the way. */
export function blockerOf(text: string, a: TrackArm, wanted: readonly Include[]): string | null {
  const doc = load(text);
  if (typeof doc === 'string') return `main's .gitlab-ci.yml is not valid YAML (${doc}): Belay will not edit it`;
  const stages = Array.isArray(doc.stages) ? doc.stages.map(String) : DEFAULT_STAGES;
  const missing = a.stages.filter((s) => !stages.includes(s));
  if (missing.length) {
    return `the pipeline has no ${missing.join(' or ')} stage, which ${a.track}'s jobs run in (as in gitlab/examples/target-project/.gitlab-ci.yml): add it to stages: first`;
  }
  const dup = wanted.find((w) => includesOf(doc).some((h) => same(h, w)));
  return dup ? `main's .gitlab-ci.yml already includes ${dup.component}${dup.component === 'proof-engine' ? ' (cited-diff)' : ''} by hand: Belay will not add it twice` : null;
}

/** After the edit: the file still parses and now includes every component of the block. */
export function holdsBlock(text: string, wanted: readonly Include[]): boolean {
  const doc = load(text);
  return typeof doc !== 'string' && wanted.every((w) => includesOf(doc).some((h) => same(h, w)));
}
