// SCI and economics of proven merge requests, from normalized jobs (jobs.mjs) and the coefficient book. Pure: the CLI
// (measure.mjs) does the reading and writing. SCI = ((E * I) + M) per R, R = one proven MR.
import { EMBODIED_COEFFICIENTS, RATE_COEFFICIENTS, footprint, intensityOf, judgeVerdict, q } from './rates.mjs';

const VERDICT = new Set(['success', 'failed']);
const per = (x, r) => (r > 0 ? x / r : null);

/** MRs whose pipeline ran a belay-proof-* job to success, or the operator's own list ("<project>!<iid>" or "<iid>"). */
export function provenMrs(jobs, proven) {
  const mrs = [...new Set(jobs.filter((j) => j.mr).map((j) => j.mr))];
  if (proven) return mrs.filter((mr) => proven.some((p) => mr === String(p) || mr.endsWith(`!${p}`))).sort();
  return [...new Set(jobs.filter((j) => j.mr && j.kind === 'proof' && j.status === 'success').map((j) => j.mr))].sort();
}

function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * Minutes a skipped or canceled job did not spend: the median of the same job name's finished runs (success or failed),
 * whole for a skipped job and less what it ran for a canceled one. A name with no finished run cannot be priced.
 */
export function savedMinutes(jobs) {
  const runs = new Map();
  for (const j of jobs) if (VERDICT.has(j.status)) runs.set(j.name, [...(runs.get(j.name) ?? []), j.minutes]);
  const saved = [];
  const unpriced = [];
  for (const j of jobs.filter((x) => x.status === 'skipped' || x.status === 'canceled')) {
    const ref = runs.get(j.name);
    if (!ref) {
      unpriced.push(j.name);
      continue;
    }
    const typical = median(ref);
    saved.push({ ...j, typical, minutes: j.status === 'skipped' ? typical : Math.max(0, typical - j.minutes) });
  }
  return { saved, unpriced };
}

/** Poll reads over the window: (fixed + per project * projects) per cycle, plus one notes read per MR update. */
export function pollReads(book, { projects, mrUpdates, windowHours }) {
  const p = book.pollReads;
  const perCycle = p.perCycleFixed + p.perProjectSteady * projects;
  const cycles = Math.ceil((windowHours * 3600) / p.intervalSeconds);
  return { perCycle, cycles, total: perCycle * cycles + p.perChangedMr * mrUpdates };
}

function windowHoursOf(jobs) {
  const t = jobs.flatMap((j) => [j.startedAt, j.finishedAt]).filter(Boolean).map(Date.parse);
  return t.length ? (Math.max(...t) - Math.min(...t)) / 3_600_000 : 0;
}

/** The whole report: every number is { value, unit, inputs, coefficient }. */
export function measure(jobs, book, opts = {}) {
  const region = opts.region ?? book.gridIntensity.region;
  const I = intensityOf(book, region);
  const proven = provenMrs(jobs, opts.proven);
  const R = proven.length;
  const ran = jobs.filter((j) => j.minutes > 0);
  const all = footprint(book, ran, I);
  const layer = footprint(book, ran.filter((j) => j.kind !== 'project'), I);
  const carbon = [...new Set([...RATE_COEFFICIENTS, ...EMBODIED_COEFFICIENTS, 'gridIntensity.regions'])];
  const sciOf = (f, label) => q(per(f.operationalG + f.embodiedG, R), 'gCO2e per proven MR',
    { scope: label, E_kWh: f.kWh.central, I_gPerKWh: I, M_g: f.embodiedG, R }, carbon);

  const verdicts = jobs.filter((j) => j.kind === 'proof' && VERDICT.has(j.status));
  const free = footprint(book, verdicts, I);
  const n = verdicts.length;
  const tokens = { input: opts.judgeInputTokens, output: opts.judgeOutputTokens };
  const judge = Object.fromEntries(['low', 'central', 'high'].map((b) => [b, judgeVerdict(book, b, I, tokens)]));
  const judgeCo = ['llmJudge.inputTokensPerVerdict', 'llmJudge.outputTokensPerVerdict', 'llmJudge.whPer1kInputTokens', 'llmJudge.whPer1kOutputTokens'];
  const freeWh = per(free.kWh.central * 1000, n);
  const freeG = per(free.operationalG + free.embodiedG, n);

  const { saved, unpriced } = savedMinutes(jobs);
  const s = footprint(book, saved, I);
  const mrUpdates = opts.mrUpdates ?? new Set(jobs.filter((j) => j.mr).map((j) => j.pipelineId)).size;
  const projects = opts.projects ?? Math.max(1, new Set(jobs.map((j) => j.project).filter((x) => x !== null)).size);
  const windowHours = opts.pollHours ?? windowHoursOf(jobs);
  const reads = pollReads(book, { projects, mrUpdates, windowHours });
  const readCo = ['pollReads.perCycleFixed', 'pollReads.perProjectSteady', 'pollReads.perChangedMr', 'pollReads.intervalSeconds'];

  return {
    schema: 'belay-sci/1',
    region,
    functionalUnit: {
      provenMrs: q(R, 'MR', { rule: opts.proven ? 'the --proven list' : 'an MR pipeline ran a belay-proof-* job to success', mrs: proven }),
      jobs: q(jobs.length, 'job', { pipelines: new Set(jobs.map((j) => j.pipelineId)).size, unfinishedLeftOut: opts.unfinished ?? 0 }),
    },
    ci: {
      minutesPerProvenMr: q(per(all.minutes, R), 'runner-min per proven MR', { minutes: all.minutes, R }),
      proofLayerMinutesPerProvenMr: q(per(layer.minutes, R), 'runner-min per proven MR', { minutes: layer.minutes, R, kinds: 'proof, gate, scan, apply' }),
      billableMinutesPerProvenMr: q(per(all.billable, R), 'compute-min per proven MR', { billable: all.billable, R }, ['runner.sizes']),
      energyPerProvenMr: q(per(all.kWh.central, R), 'kWh per proven MR', { low: per(all.kWh.low, R), high: per(all.kWh.high, R), R }, RATE_COEFFICIENTS),
      costPerProvenMr: q(per(all.usd, R), 'USD per proven MR', { billable: all.billable, R }, ['price.usdPerComputeMinute', 'runner.sizes']),
    },
    sci: { pipeline: sciOf(all, 'every job in the export'), proofLayer: sciOf(layer, 'belay-* jobs only') },
    proof: {
      verdicts: q(n, 'verdict', { rule: 'belay-proof-* jobs that finished success or failed' }),
      modelFreeEnergyPerVerdict: q(freeWh, 'Wh per verdict', { kWh: free.kWh.central, verdicts: n }, RATE_COEFFICIENTS),
      modelFreeCarbonPerVerdict: q(freeG, 'gCO2e per verdict', { operationalG: free.operationalG, embodiedG: free.embodiedG, verdicts: n }, carbon),
      modelFreeCostPerVerdict: q(per(free.usd, n), 'USD per verdict', { billable: free.billable, verdicts: n }, ['price.usdPerComputeMinute']),
      judgeEnergyPerVerdict: q(judge.central.wh, 'Wh per verdict', { low: judge.low.wh, high: judge.high.wh, inputTokens: judge.central.input, outputTokens: judge.central.output }, judgeCo),
      judgeCarbonPerVerdict: q(judge.central.g, 'gCO2e per verdict', { low: judge.low.g, high: judge.high.g, I_gPerKWh: I }, [...judgeCo, 'gridIntensity.regions']),
      judgeCostPerVerdict: q(judge.central.usd, 'USD per verdict', { low: judge.low.usd, high: judge.high.usd }, ['llmJudge.usdPerMTokInput', 'llmJudge.usdPerMTokOutput']),
      judgeOverModelFreeEnergy: q(freeWh ? judge.central.wh / freeWh : null, 'ratio', { low: freeWh ? judge.low.wh / freeWh : null, high: freeWh ? judge.high.wh / freeWh : null }),
      judgeOverModelFreeCarbon: q(freeG ? judge.central.g / freeG : null, 'ratio', { low: freeG ? judge.low.g / freeG : null, high: freeG ? judge.high.g / freeG : null }),
      judgeEnergyPerProvenMr: q(per(judge.central.wh * n, R), 'Wh per proven MR', { verdicts: n, R }, judgeCo),
    },
    saved: {
      minutes: q(s.minutes, 'runner-min', { skipped: saved.filter((j) => j.status === 'skipped').length, canceled: saved.filter((j) => j.status === 'canceled').length, unpriced }),
      minutesPerProvenMr: q(per(s.minutes, R), 'runner-min per proven MR', { minutes: s.minutes, R }),
      energy: q(s.kWh.central, 'kWh', { low: s.kWh.low, high: s.kWh.high }, RATE_COEFFICIENTS),
      carbon: q(s.operationalG + s.embodiedG, 'gCO2e', { operationalG: s.operationalG, embodiedG: s.embodiedG }, carbon),
      cost: q(s.usd, 'USD', { billable: s.billable }, ['price.usdPerComputeMinute', 'runner.sizes']),
      jobs: saved.map((j) => ({ id: j.id, name: j.name, status: j.status, savedMinutes: j.minutes, typicalMinutes: j.typical })),
    },
    apiReads: {
      perCycle: q(reads.perCycle, 'GitLab API reads per poll cycle', { projects }, readCo),
      window: q(reads.total, 'GitLab API reads', { cycles: reads.cycles, windowHours, mrUpdates }, readCo),
      perProvenMr: q(per(reads.total, R), 'GitLab API reads per proven MR', { total: reads.total, R }, readCo),
    },
  };
}
