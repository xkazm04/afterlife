// A fleet repo's optional `frontier: {objective, metrics}`, validated strictly: an unknown key, a parse kind the
// runner does not implement or a regex that does not compile stops the run, so a typo never measures nothing.
// The metric shape is Ascent's techMetrics (/infinite SKILL.md, T3): {name, command, parse, direction, threshold,
// timeoutMin?}, parse one of {kind: wall, unit?}, {kind: json-sum, file, field, scale?, unit?}, {kind: regex, pattern, unit?}.
import type { Frontier, TechMetric, TechParse } from '../index';

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function onlyKeys(o: Record<string, unknown>, keys: readonly string[], where: string): void {
  const extra = Object.keys(o).filter((k) => !keys.includes(k));
  if (extra.length) throw new Error(`${where}: unknown key(s) ${extra.join(', ')}`);
}

const str = (v: unknown, where: string, key: string): string => {
  if (typeof v !== 'string' || !v.trim()) throw new Error(`${where}: ${key} must be a non-empty string`);
  return v.trim();
};

const unitOf = (p: Record<string, unknown>, where: string): { unit?: string } => (p.unit === undefined ? {} : { unit: str(p.unit, where, 'unit') });

function parseOf(p: unknown, where: string): TechParse {
  if (!isObj(p)) throw new Error(`${where}: parse must be a mapping with a kind`);
  if (p.kind === 'wall') {
    onlyKeys(p, ['kind', 'unit'], where);
    return { kind: 'wall', ...unitOf(p, where) };
  }
  if (p.kind === 'json-sum') {
    onlyKeys(p, ['kind', 'file', 'field', 'scale', 'unit'], where);
    const file = str(p.file, where, 'parse.file');
    // Read inside the measurement worktree only: no absolute path, no way out of it.
    if (/^([A-Za-z]:|[\\/])/.test(file) || file.split(/[\\/]/).includes('..')) throw new Error(`${where}: parse.file must be a path inside the repo`);
    if (p.scale !== undefined && (typeof p.scale !== 'number' || !Number.isFinite(p.scale) || p.scale === 0)) throw new Error(`${where}: parse.scale must be a non-zero number`);
    return { kind: 'json-sum', file, field: str(p.field, where, 'parse.field'), ...(p.scale !== undefined ? { scale: p.scale as number } : {}), ...unitOf(p, where) };
  }
  if (p.kind === 'regex') {
    onlyKeys(p, ['kind', 'pattern', 'unit'], where);
    const pattern = str(p.pattern, where, 'parse.pattern');
    let re: RegExp;
    try {
      re = new RegExp(pattern, 'm');
    } catch {
      throw new Error(`${where}: parse.pattern is not a valid regular expression`);
    }
    // The value is the first capture group: a pattern without one measures nothing.
    if (new RegExp(`${re.source}|`).exec('')!.length < 2) throw new Error(`${where}: parse.pattern needs a capture group`);
    return { kind: 'regex', pattern, ...unitOf(p, where) };
  }
  throw new Error(`${where}: parse.kind must be wall, json-sum or regex`);
}

function metricOf(m: unknown, where: string, first: boolean): TechMetric {
  if (!isObj(m)) throw new Error(`${where} must be a mapping`);
  onlyKeys(m, ['name', 'command', 'parse', 'direction', 'threshold', 'timeoutMin'], where);
  const name = str(m.name, where, 'name');
  if (!/^[A-Za-z0-9][A-Za-z0-9 ._-]{0,59}$/.test(name)) throw new Error(`${where}: name must be a short plain label`);
  const command = m.command === null ? null : str(m.command, where, 'command');
  if (command === null && first) throw new Error(`${where}: the first metric needs a command (null reads what an earlier one left)`);
  const parse = parseOf(m.parse, where);
  if (command === null && parse.kind === 'wall') throw new Error(`${where}: a wall metric needs a command to time`);
  if (m.direction !== 'up' && m.direction !== 'down') throw new Error(`${where}: direction must be up or down`);
  if (typeof m.threshold !== 'number' || !(m.threshold > 0) || m.threshold > 10) throw new Error(`${where}: threshold must be a fraction above 0 (0.1 = 10%)`);
  if (m.timeoutMin !== undefined && (typeof m.timeoutMin !== 'number' || !(m.timeoutMin > 0) || m.timeoutMin > 120)) throw new Error(`${where}: timeoutMin must be between 0 and 120`);
  return { name, command, parse, direction: m.direction, threshold: m.threshold, ...(m.timeoutMin !== undefined ? { timeoutMin: m.timeoutMin as number } : {}) };
}

/** The validated frontier, or undefined when the repo has none. */
export function parseFrontier(v: unknown, where: string): Frontier | undefined {
  if (v === undefined) return undefined;
  const w = `${where}: frontier`;
  if (!isObj(v)) throw new Error(`${w} must be a mapping with objective and metrics`);
  onlyKeys(v, ['objective', 'metrics'], w);
  const objective = str(v.objective, w, 'objective');
  if (objective.length > 4000) throw new Error(`${w}: objective is longer than 4000 characters`);
  if (!Array.isArray(v.metrics) || v.metrics.length === 0 || v.metrics.length > 8) throw new Error(`${w}: metrics must be a list of 1 to 8 metrics`);
  const metrics = v.metrics.map((m, i) => metricOf(m, `${w}.metrics[${i}]`, i === 0));
  const names = new Set(metrics.map((m) => m.name));
  if (names.size !== metrics.length) throw new Error(`${w}: metric names must be unique`);
  return { objective, metrics };
}
