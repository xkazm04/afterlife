// T4's arm content is the example's, not Belay's own idea: every include it adds is one gitlab/examples/target-project
// writes, with the same inputs, and every input is one the component's template declares (its required ones all given).
import fs from 'node:fs';
import path from 'node:path';
import { parse, parseAllDocuments } from 'yaml';
import { describe, expect, it } from 'vitest';
import { DEMO_PIN } from '../config';
import { armOf, type ArmPin } from '../content';

const ROOT = path.resolve(import.meta.dirname, '../../../../..');
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');
type Rec = Record<string, unknown>;

const example = parse(read('gitlab/examples/target-project/.gitlab-ci.yml')) as { include: Rec[] };
const exampleOf = (component: string, cls: unknown): Rec | undefined =>
  example.include.find((i) => typeof i.component === 'string' && i.component.includes(`/belay-pack/${component}@`) && (cls === undefined || (i.inputs as Rec).class === cls));
const specOf = (component: string): Record<string, Rec> =>
  ((parseAllDocuments(read(`gitlab/components/templates/${component}/template.yml`))[0]?.toJS() as { spec: { inputs: Record<string, Rec> } }).spec.inputs);

const PINNED: ArmPin = { ...DEMO_PIN, engineCommit: '0000000000000000000000000000000000000000' };
const t4 = armOf('T4')!;

describe("T4's arm content", () => {
  it('is defined; other tracks are not yet', () => {
    expect(t4).toMatchObject({ track: 'T4', key: 'guardrail' });
    for (const t of ['T1', 'T2', 'T3', 'T5', 'T6', 'T7', 'T8']) expect(armOf(t)).toBeNull();
  });

  it.each(t4.includes(PINNED).map((i) => [i.component, i] as const))('%s is an include of the example, with its inputs', (_name, inc) => {
    const cls = inc.inputs.find(([k]) => k === 'class')?.[1];
    const ex = exampleOf(inc.component, cls);
    expect(ex, `the example includes ${inc.component}`).toBeDefined();
    expect(Object.fromEntries(inc.inputs)).toEqual(ex?.inputs);
  });

  it.each(t4.includes(DEMO_PIN).map((i) => [i.component, i] as const))("%s's inputs are declared by its template, required ones given", (_name, inc) => {
    const spec = specOf(inc.component);
    const keys = inc.inputs.map(([k]) => k);
    for (const k of keys) expect(Object.keys(spec), `${inc.component} declares ${k}`).toContain(k);
    const required = Object.entries(spec).filter(([, v]) => !('default' in (v ?? {}))).map(([k]) => k);
    for (const k of required) expect(keys).toContain(k);
  });

  it("runs in stages the example declares, and the demo pin is the example's values", () => {
    const stages = (parse(read('gitlab/examples/target-project/.gitlab-ci.yml')) as { stages: string[] }).stages;
    for (const s of t4.stages) expect(stages).toContain(s);
    expect(exampleOf('proof-engine', 'cited-diff')?.component).toBe(`$CI_SERVER_FQDN/acme/belay-pack/proof-engine@${DEMO_PIN.packVersion}`);
    // F4: starting the guardrail needs a write token, so belay-apply does it; neither the example nor T4 includes flow-dispatch.
    expect(exampleOf('flow-dispatch', undefined)).toBeUndefined();
    expect(t4.includes(DEMO_PIN).map((i) => i.component)).toEqual(['proof-engine']);
  });

  it('says where BELAY_BOT_TOKEN lives (belay-apply, never the target), in order, and names no value', () => {
    expect(t4.notes).toHaveLength(5);
    expect(t4.notes[0]).toMatch(/belay-apply, with BELAY_BOT_TOKEN set there as a protected CI variable, never on this project/);
    expect(t4.notes[1]).toMatch(/No job of this project needs a write token, so none can read one \(F4\)/);
    expect(t4.notes[2]).toBe('Afterlife never sets it.');
    expect(t4.notes[3]).toMatch(/fails closed/);
    expect(t4.notes[4]).toMatch(/guardrail consumer id in its apply\.json/);
    for (const n of t4.notes) expect(n).not.toMatch(/glpat-|=/);
  });
});
