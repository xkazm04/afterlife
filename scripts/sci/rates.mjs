// Per-minute rates derived from the coefficient book (coefficients.json). Pure. Each rate keeps the book paths it used,
// so a report can say which coefficient every number came from.

const MINUTES_PER_YEAR = 365.25 * 24 * 60;

/** A number with its unit, what it was computed from, and the book entries it used. */
export const q = (value, unit, inputs = {}, coefficient = []) => ({ value, unit, inputs, coefficient });

/** Grid intensity for the region, in gCO2e/kWh; an unknown region is an error, never a silent default. */
export function intensityOf(book, region = book.gridIntensity.region) {
  const i = book.gridIntensity.regions[region];
  if (typeof i !== 'number') throw new Error(`no grid intensity for region "${region}" (known: ${Object.keys(book.gridIntensity.regions).join(', ')})`);
  return i;
}

/** Runner power at a utilization, in watts at the wall (PUE applied): vCPU * (min + u * (max - min)) + GB * memory watts. */
export function wattsOf(book, size, utilization) {
  const s = book.runner.sizes[size];
  const cpu = book.cpuPower.minWattsPerVcpu + utilization * (book.cpuPower.maxWattsPerVcpu - book.cpuPower.minWattsPerVcpu);
  return (s.vcpu * cpu + s.memoryGb * book.memoryPower.kWhPerGbHour * 1000) * book.pue.value;
}

/** kWh per runner-minute at the low, central and high utilization. */
export function kWhPerMinute(book, size) {
  const u = book.cpuPower.utilization;
  const at = (x) => wattsOf(book, size, x) / 1000 / 60;
  return { low: at(u.low), central: at(u.central), high: at(u.high) };
}

/** Embodied gCO2e per runner-minute: M = TE * (TiR / EL) * (RR / ToR), with RR the job's vCPU and ToR the host's. */
export function embodiedPerMinute(book, size) {
  const e = book.embodied;
  return ((e.hostTotalKgCo2e * 1000) / (e.lifespanYears * MINUTES_PER_YEAR)) * (book.runner.sizes[size].vcpu / e.hostVcpu);
}

export const RATE_COEFFICIENTS = [
  'runner.sizes', 'cpuPower.minWattsPerVcpu', 'cpuPower.maxWattsPerVcpu', 'cpuPower.utilization', 'memoryPower.kWhPerGbHour', 'pue.value',
];
export const EMBODIED_COEFFICIENTS = ['embodied.hostTotalKgCo2e', 'embodied.lifespanYears', 'embodied.hostVcpu', 'runner.sizes'];

/**
 * The footprint of a set of job-minutes: { minutes, billable, kWh {low, central, high}, operationalG, embodiedG, usd }.
 * `items` are { minutes, size }. Operational carbon uses the central energy; the energy range is kept beside it.
 */
export function footprint(book, items, intensity) {
  const out = { minutes: 0, billable: 0, kWh: { low: 0, central: 0, high: 0 }, operationalG: 0, embodiedG: 0, usd: 0 };
  for (const { minutes, size } of items) {
    const k = kWhPerMinute(book, size);
    out.minutes += minutes;
    out.billable += minutes * book.runner.sizes[size].costFactor;
    for (const b of ['low', 'central', 'high']) out.kWh[b] += minutes * k[b];
    out.embodiedG += minutes * embodiedPerMinute(book, size);
  }
  out.operationalG = out.kWh.central * intensity;
  out.usd = out.billable * book.price.usdPerComputeMinute;
  return out;
}

/** One judge verdict at a bound: Wh, gCO2e at the given intensity, and USD at the list price. */
export function judgeVerdict(book, bound, intensity, tokens = {}) {
  const j = book.llmJudge;
  const input = tokens.input ?? j.inputTokensPerVerdict[bound];
  const output = tokens.output ?? j.outputTokensPerVerdict[bound];
  const wh = (input / 1000) * j.whPer1kInputTokens[bound] + (output / 1000) * j.whPer1kOutputTokens[bound];
  return { input, output, wh, g: (wh / 1000) * intensity, usd: (input / 1e6) * j.usdPerMTokInput + (output / 1e6) * j.usdPerMTokOutput };
}
