// Pins the SCI arithmetic on the committed fixture with a round-number book, so every expected value can be checked by
// hand: a small runner is 60 W (0.001 kWh/min), 1 g/min embodied; a medium one is twice that. No file but the fixture, no network.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { normalize, parseDocuments, rawJobs, sizeOf } from './jobs.mjs';
import { measure, provenMrs, savedMinutes } from './sci.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = fs.readFileSync(path.join(here, '__fixtures__', 'jobs.json'), 'utf8');

const book = {
  runner: {
    default: 'small',
    sizes: {
      small: { vcpu: 2, memoryGb: 0, costFactor: 1, tags: ['saas-linux-small-amd64'] },
      medium: { vcpu: 4, memoryGb: 0, costFactor: 2, tags: ['saas-linux-medium-amd64'] },
    },
  },
  cpuPower: { minWattsPerVcpu: 0, maxWattsPerVcpu: 60, utilization: { low: 0, central: 0.5, high: 1 } },
  memoryPower: { kWhPerGbHour: 0 },
  pue: { value: 1 },
  gridIntensity: { region: 'test', regions: { test: 1000, clean: 0 } },
  embodied: { hostTotalKgCo2e: 525.96, hostVcpu: 2, lifespanYears: 1 },
  price: { usdPerComputeMinute: 0.01 },
  llmJudge: {
    inputTokensPerVerdict: { low: 1000, central: 1000, high: 1000 }, outputTokensPerVerdict: { low: 1000, central: 1000, high: 1000 },
    whPer1kInputTokens: { low: 1, central: 1, high: 1 }, whPer1kOutputTokens: { low: 2, central: 2, high: 2 }, usdPerMTokInput: 1, usdPerMTokOutput: 2,
  },
  pollReads: { intervalSeconds: 3600, perCycleFixed: 1, perProjectSteady: 2, perChangedMr: 1 },
};
const { jobs, unfinished } = normalize(rawJobs(fixture), book.runner);
const r = measure(jobs, book);

describe('scripts/sci jobs', () => {
  it('reads back-to-back exports, drops the duplicate id and leaves the running job out', () => {
    expect(rawJobs(fixture)).toHaveLength(18);
    expect(jobs).toHaveLength(16);
    expect(unfinished).toBe(1);
  });

  it('splits documents without being fooled by brackets inside strings', () => {
    expect(parseDocuments('[{"name":"a]["}]\n[{"name":"{b"}]')).toEqual([[{ name: 'a][' }], [{ name: '{b' }]]);
    expect(() => parseDocuments('[{"a":1}')).toThrow(/ends inside/);
  });

  it('reads the { pipelines, jobs } shape and takes the ref and source from the pipeline', () => {
    const doc = { pipelines: [{ id: 5, ref: 'refs/merge-requests/3/head', source: 'merge_request_event', project_id: 1 }], jobs: { 5: [{ id: 1, name: 'belay-proof-repro', status: 'success', duration: 60, pipeline: { id: 5 } }] } };
    const [j] = normalize(rawJobs(JSON.stringify(doc)), book.runner).jobs;
    expect(j).toMatchObject({ mr: '1!3', kind: 'proof', source: 'merge_request_event', minutes: 1 });
  });

  it('sizes a job from its tags, then the runner description, else the default', () => {
    expect(sizeOf({ tag_list: ['saas-linux-medium-amd64'] }, book.runner)).toBe('medium');
    expect(sizeOf({ runner: { description: '3-blue.saas-linux-medium-amd64.runners-manager.gitlab.com/default' } }, book.runner)).toBe('medium');
    expect(sizeOf({ tag_list: ['self-managed'] }, book.runner)).toBe('small');
  });
});

describe('scripts/sci measure', () => {
  it('R is the MRs with a successful belay-proof job; the --proven list replaces the rule', () => {
    expect(provenMrs(jobs)).toEqual(['90010001!7', '90010001!9']);
    expect(provenMrs(jobs, ['8'])).toEqual(['90010001!8']);
    expect(r.functionalUnit.provenMrs.value).toBe(2);
  });

  it('charges every runner-minute in the export to the proven MRs', () => {
    expect(r.ci.minutesPerProvenMr.value).toBeCloseTo(1420 / 60 / 2, 9);
    expect(r.ci.proofLayerMinutesPerProvenMr.value).toBeCloseTo(310 / 60 / 2, 9);
    expect(r.ci.billableMinutesPerProvenMr.value).toBeCloseTo(1660 / 60 / 2, 9); // the medium build counts twice
    expect(r.ci.costPerProvenMr.value).toBeCloseTo((1660 / 60 / 2) * 0.01, 9);
  });

  it('SCI = (E * I + M) / R for the pipeline and for the proof layer', () => {
    const small = 1420 / 60 - 4;
    expect(r.ci.energyPerProvenMr.value).toBeCloseTo((small * 0.001 + 4 * 0.002) / 2, 12);
    expect(r.sci.pipeline.inputs.M_g).toBeCloseTo(small + 8, 9);
    expect(r.sci.pipeline.value).toBeCloseTo(((small + 8) * 2) / 2, 9);
    expect(r.sci.proofLayer.value).toBeCloseTo(((310 / 60) * 2) / 2, 9);
    expect(r.ci.energyPerProvenMr.inputs.low).toBe(0);
  });

  it('compares the model-free verdicts with an LLM judge on the same verdict count', () => {
    expect(r.proof.verdicts.value).toBe(3); // the skipped proof job is no verdict
    expect(r.proof.modelFreeEnergyPerVerdict.value).toBeCloseTo(4 / 3, 9);
    expect(r.proof.modelFreeCarbonPerVerdict.value).toBeCloseTo(8 / 3, 9);
    expect(r.proof.judgeEnergyPerVerdict.value).toBeCloseTo(3, 12);
    expect(r.proof.judgeCarbonPerVerdict.value).toBeCloseTo(3, 12);
    expect(r.proof.judgeCostPerVerdict.value).toBeCloseTo(0.003, 12); // 1k tokens at $1 + 1k at $2 per million
    expect(r.proof.judgeOverModelFreeEnergy.value).toBeCloseTo(2.25, 9);
    expect(r.proof.judgeEnergyPerProvenMr.value).toBeCloseTo(4.5, 9);
    expect(measure(jobs, book, { judgeInputTokens: 4000 }).proof.judgeEnergyPerVerdict.value).toBeCloseTo(6, 12);
  });

  it('prices a skipped job at its median finished run and a canceled one at what it had left', () => {
    expect(r.saved.jobs.map((j) => [j.name, j.status, Number(j.savedMinutes.toFixed(6))])).toEqual([
      ['belay-proof-exploit-test', 'skipped', 1.5],
      ['belay-tier-gate', 'canceled', 0.333333],
      ['unit', 'canceled', 2.5],
    ]);
    expect(r.saved.minutes.value).toBeCloseTo(1.5 + 1 / 3 + 2.5, 9);
    expect(r.saved.cost.value).toBeCloseTo((1.5 + 1 / 3 + 2.5) * 0.01, 9);
    const lone = [{ id: 1, name: 'never-ran', status: 'canceled', minutes: 2 }, { id: 2, name: 'x', status: 'success', minutes: 1 }, { id: 3, name: 'x', status: 'canceled', minutes: 5 }];
    expect(savedMinutes(lone)).toMatchObject({ unpriced: ['never-ran'], saved: [{ id: 3, minutes: 0 }] }); // ran past the median: saves nothing
  });

  it('counts poll reads over the export window and per proven MR', () => {
    expect(r.apiReads.perCycle.value).toBe(3);
    expect(r.apiReads.window.value).toBe(2 * 3 + 4); // 2 cycles in 2 hours, one notes read per MR pipeline
    expect(r.apiReads.perProvenMr.value).toBe(5);
    expect(measure(jobs, book, { pollHours: 10, projects: 3, mrUpdates: 0 }).apiReads.window.value).toBe(10 * 7);
  });

  it('a region changes I only, an unknown region fails, and no proven MR gives n/a rather than a division by zero', () => {
    expect(measure(jobs, book, { region: 'clean' }).sci.pipeline.value).toBeCloseTo((1420 / 60 - 4 + 8) / 2, 9); // I = 0: M / R only
    expect(() => measure(jobs, book, { region: 'mars' })).toThrow(/no grid intensity/);
    const none = measure(jobs.filter((j) => j.kind !== 'proof'), book);
    expect([none.functionalUnit.provenMrs.value, none.sci.pipeline.value, none.proof.modelFreeEnergyPerVerdict.value]).toEqual([0, null, null]);
  });
});
