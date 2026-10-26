// Each track's arm content is the example's, not Afterlife's own idea: every include it adds is one gitlab/examples/target-project
// writes, with the same inputs, and every input is one the component's template declares (its required ones all given).
import fs from 'node:fs';
import path from 'node:path';
import { parse, parseAllDocuments } from 'yaml';
import { describe, expect, it } from 'vitest';
import { DEMO_PIN } from '../config';
import { armOf, type ArmPin, type Include } from '../content';

const ROOT = path.resolve(import.meta.dirname, '../../../../..');
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');
type Rec = Record<string, unknown>;

const example = parse(read('gitlab/examples/target-project/.gitlab-ci.yml')) as { include: Rec[]; stages: string[] };
const exampleOf = (component: string, cls: unknown): Rec | undefined =>
  example.include.find((i) => typeof i.component === 'string' && i.component.includes(`/belay-pack/${component}@`) && (cls === undefined || (i.inputs as Rec).class === cls));
const specOf = (component: string): Record<string, Rec> =>
  ((parseAllDocuments(read(`gitlab/components/templates/${component}/template.yml`))[0]?.toJS() as { spec: { inputs: Record<string, Rec> } }).spec.inputs);

const PINNED: ArmPin = { ...DEMO_PIN, engineCommit: '0000000000000000000000000000000000000000' };
const t4 = armOf('T4')!;
const ARMED = ['T4', 'T3', 'T6', 'T1'] as const;
const each = (pin: ArmPin) => ARMED.flatMap((t) => armOf(t)!.includes(pin).map((i) => [`${t} ${i.component}`, i] as [string, Include]));
const withoutCommit = (r: Rec | undefined): Rec => Object.fromEntries(Object.entries(r ?? {}).filter(([k]) => k !== 'engine_commit'));

describe("the tracks' arm content", () => {
  it('T4, T3, T6 and T1 are defined; the other tracks are not yet', () => {
    expect(ARMED.map((t) => [armOf(t)?.track, armOf(t)?.key])).toEqual([['T4', 'guardrail'], ['T3', 'governor'], ['T6', 'maturity'], ['T1', 'patcher']]);
    for (const t of ['T2', 'T5', 'T7', 'T8']) expect(armOf(t)).toBeNull();
  });

  it.each(each(PINNED))('%s is an include of the example, with its inputs, pinned like T4', (_name, inc) => {
    const cls = inc.inputs.find(([k]) => k === 'class')?.[1];
    const ex = exampleOf(inc.component, cls);
    expect(ex, `the example includes ${inc.component}`).toBeDefined();
    const mine = Object.fromEntries(inc.inputs);
    // Every include carries the engine pin, as T4's does; the example leaves engine_commit off maturity-scan only.
    expect(mine.engine_commit).toBe(PINNED.engineCommit);
    expect(withoutCommit(mine)).toEqual(withoutCommit(ex?.inputs as Rec));
  });

  it.each(each(DEMO_PIN))("%s's inputs are declared by its template, required ones given", (_name, inc) => {
    const spec = specOf(inc.component);
    const keys = inc.inputs.map(([k]) => k);
    for (const k of keys) expect(Object.keys(spec), `${inc.component} declares ${k}`).toContain(k);
    const required = Object.entries(spec).filter(([, v]) => !('default' in (v ?? {}))).map(([k]) => k);
    for (const k of required) expect(keys).toContain(k);
    expect(keys).not.toContain('engine_commit'); // the demo pin has none: the example's all-zero commit is a placeholder
  });

  it("each runs in a stage the example declares, or in the component's default (.post), which every pipeline has", () => {
    for (const t of ARMED) for (const s of armOf(t)!.stages) expect([...example.stages, '.post']).toContain(s);
    expect(armOf('T1')!.stageChoices['proof-engine']).toEqual(['review']); // exploit-test reads belay-replay's artifacts
    expect(exampleOf('proof-engine', 'cited-diff')?.component).toBe(`$CI_SERVER_FQDN/acme/belay-pack/proof-engine@${DEMO_PIN.packVersion}`);
    // F4: starting the guardrail needs a write token, so belay-apply does it; neither the example nor any track includes flow-dispatch.
    expect(exampleOf('flow-dispatch', undefined)).toBeUndefined();
    expect(ARMED.map((t) => armOf(t)!.includes(DEMO_PIN).map((i) => i.component))).toEqual([['proof-engine'], ['tier-gate'], ['maturity-scan'], ['proof-engine']]);
  });

  it('T3 names the proof authors from the pin, and refuses without them; the others need no more than T4', () => {
    expect(Object.fromEntries(armOf('T3')!.includes(DEMO_PIN)[0]!.inputs).proof_authors).toBe('belay-bot');
    const bare: ArmPin = { packVersion: '1.0.0', engineRef: 'v0.1.0' };
    expect(armOf('T3')!.refuses?.(bare)).toMatch(/set AFTERLIFE_PROOF_AUTHORS/);
    expect(armOf('T3')!.refuses?.(DEMO_PIN)).toBeNull();
    for (const t of ['T4', 'T6', 'T1']) expect(armOf(t)!.refuses?.(bare) ?? null).toBeNull();
  });

  it('every track says the target only reports (F4) and names no token value', () => {
    for (const t of ARMED) {
      const a = armOf(t)!;
      expect(a.notes).toContain('No job of this project needs a write token, so none can read one (F4).');
      for (const n of a.notes) expect(n).not.toMatch(/glpat-|=/);
    }
    expect(armOf('T3')!.notes[0]).toMatch(/only reports what the gate will decide.*runs in belay-apply/);
    expect(armOf('T6')!.notes.join(' ')).toMatch(/adds no scanner.*Jobs\/SAST/);
    expect(armOf('T1')!.notes.join(' ')).toMatch(/belay-replay.*add them yourself/);
  });

  it('says where AFTERLIFE_BOT_TOKEN lives (belay-apply, never the target), in order, and names no value', () => {
    expect(t4.notes).toHaveLength(5);
    expect(t4.notes[0]).toMatch(/belay-apply, with AFTERLIFE_BOT_TOKEN set there as a protected CI variable, never on this project/);
    expect(t4.notes[1]).toMatch(/No job of this project needs a write token, so none can read one \(F4\)/);
    expect(t4.notes[2]).toBe('Afterlife never sets it.');
    expect(t4.notes[3]).toMatch(/fails closed/);
    expect(t4.notes[4]).toMatch(/guardrail consumer id in its apply\.json/);
    for (const n of t4.notes) expect(n).not.toMatch(/glpat-|=/);
  });
});
