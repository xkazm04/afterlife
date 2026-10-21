// One line of a wave's jsonl -> a belay.run/0 event, or null. Malformed means: not JSON, not this schema version, an
// unknown kind, or a field the fold relies on missing or the wrong type. The caller counts the nulls.
import { RUN_SCHEMA, type RunEvent } from '@/schemas/run/run';

const KINDS = new Set(['wave.start', 'wave.plan', 'lane.start', 'lane.usage', 'lane.end', 'wave.tech', 'wave.end']);
const OUTCOMES = new Set(['landed', 'parked', 'failed', 'budget', 'timeout']);

const str = (v: unknown): v is string => typeof v === 'string';
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function parseRunLine(line: string): RunEvent | null {
  let o: Record<string, unknown>;
  try {
    const j: unknown = JSON.parse(line);
    if (typeof j !== 'object' || j === null || Array.isArray(j)) return null;
    o = j as Record<string, unknown>;
  } catch {
    return null;
  }
  if (o.v !== RUN_SCHEMA || !str(o.kind) || !KINDS.has(o.kind)) return null;
  if (!str(o.ts) || !str(o.repo) || !num(o.wave) || !str(o.promptVersion)) return null;
  const ok = (good: boolean): RunEvent | null => (good ? (o as unknown as RunEvent) : null);
  switch (o.kind) {
    case 'wave.plan':
      return ok(num(o.raw) && num(o.parsed) && Array.isArray(o.items) && o.items.every(str));
    case 'lane.start':
      return ok(str(o.lane) && str(o.title));
    case 'lane.usage':
      return ok(str(o.lane) && num(o.costUsd) && num(o.inputTokens) && num(o.outputTokens) && num(o.cacheReadTokens) && num(o.cacheWriteTokens));
    case 'lane.end':
      return ok(str(o.lane) && str(o.outcome) && OUTCOMES.has(o.outcome) && num(o.wallSec) && Array.isArray(o.commits));
    case 'wave.tech':
      return ok(str(o.from) && str(o.to) && Array.isArray(o.metrics) && o.metrics.every((m) => typeof m === 'object' && m !== null && str((m as { name?: unknown }).name)));
    case 'wave.end':
      return ok(str(o.branch) && typeof o.mergeable === 'boolean' && num(o.costUsd));
    default:
      return ok(num(o.lanes) && str(o.model) && str(o.base));
  }
}
