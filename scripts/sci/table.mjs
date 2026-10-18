// The report as a short plain-text table: one row per number, with its unit, its inputs and the
// coefficient book entries it used (by section; the JSON report keeps the full paths).

/** 4 significant figures, no exponent below 1e-6; null reads "n/a" (no proven MR, no verdict). */
export function fmt(x) {
  if (x === null || x === undefined) return 'n/a';
  if (typeof x !== 'number') return String(x);
  if (Number.isInteger(x)) return String(x);
  return Math.abs(x) >= 1e-6 ? String(Number(x.toPrecision(4))) : x.toExponential(3);
}

const inputsOf = (inputs) =>
  Object.entries(inputs)
    .map(([k, v]) => `${k}=${Array.isArray(v) ? `[${v.join(',')}]` : fmt(v)}`)
    .join(' ');

export function table(report) {
  const rows = [];
  for (const [section, numbers] of Object.entries(report)) {
    if (typeof numbers !== 'object' || numbers === null) continue;
    for (const [key, n] of Object.entries(numbers)) {
      if (!n || typeof n !== 'object' || !('unit' in n)) continue;
      rows.push([`${section}.${key}`, `${fmt(n.value)} ${n.unit}`, inputsOf(n.inputs), [...new Set(n.coefficient.map((c) => c.split('.')[0]))].join(', ')]);
    }
  }
  const w0 = Math.max(...rows.map((r) => r[0].length));
  const w1 = Math.max(...rows.map((r) => r[1].length));
  const lines = rows.map(([a, b, c, d]) => `${a.padEnd(w0)}  ${b.padEnd(w1)}  ${c}${d ? `  {${d}}` : ''}`);
  return [`SCI report (${report.schema}, region ${report.region}): number, unit, inputs, {coefficients}`, ...lines].join('\n');
}
