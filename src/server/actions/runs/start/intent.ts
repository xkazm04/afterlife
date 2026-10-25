// A start-run intent, validated field by field before anything is read: startRunAction is a public endpoint. Nothing is
// coerced. Every value that reaches the argv is a whitelisted shape (the runner's own slug, ref and model rules) and is
// passed as one argument, never through a shell.
import { MODEL_TOKEN } from '../../../../../runner/agent/spawn';
import { FLEET_BASE, FLEET_SLUG } from '../../../../../runner/fleet/names';
import { BRANCH } from '../../vitals/intents';
import { RUN_BOUNDS, RUN_IDEAS, type RunIdea, type StartRun } from './types';

export type StartParse = { ok: true; intent: StartRun } | { ok: false; reason: string };
const no = (reason: string): StartParse => ({ ok: false, reason });

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, re: RegExp, max: number): string | null => (typeof v === 'string' && v.length <= max && re.test(v) ? v : null);
const int = (v: unknown, [min, max]: readonly [number, number]): number | null => (typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : null);
const usd = (v: unknown, [min, max]: readonly [number, number]): number | null => (typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : null);

function ideasOf(v: unknown): RunIdea[] | null {
  if (!Array.isArray(v)) return null;
  const out = RUN_IDEAS.filter((i) => v.includes(i));
  return out.length === v.length && new Set(v).size === v.length ? out : null; // an unknown or repeated name is refused
}

export function parseStartRun(raw: unknown): StartParse {
  if (!isRec(raw) || raw.kind !== 'start-run') return no('the intent is not a start-run');
  const repo = str(raw.repo, FLEET_SLUG, 100);
  if (!repo) return no('repo must be a fleet slug');
  const mode = raw.mode === 'execute' || raw.mode === 'propose' ? raw.mode : null;
  if (!mode) return no('mode must be execute or propose');
  const base = raw.base === undefined ? undefined : str(raw.base, FLEET_BASE, 200);
  if (base === null) return no('base must be a git ref or sha');
  const onto = raw.onto === undefined ? undefined : str(raw.onto, BRANCH, 200);
  if (onto === null) return no('onto must be a local branch name');
  if (base !== undefined && onto !== undefined) return no('base and onto are exclusive: a new branch starts from base, an existing branch is its own start');
  if (mode === 'propose' && (base !== undefined || onto !== undefined)) return no('propose mode changes no branch: base and onto are for execute');
  const waves = int(raw.waves, RUN_BOUNDS.waves);
  const lanes = int(raw.lanes, RUN_BOUNDS.lanes);
  if (waves === null || lanes === null) return no(`waves must be ${RUN_BOUNDS.waves.join(' to ')} and lanes ${RUN_BOUNDS.lanes.join(' to ')}, whole numbers`);
  const laneCapUsd = usd(raw.laneCapUsd, RUN_BOUNDS.laneCapUsd);
  const waveCapUsd = usd(raw.waveCapUsd, RUN_BOUNDS.waveCapUsd);
  if (laneCapUsd === null || waveCapUsd === null) return no(`the lane cap must be $${RUN_BOUNDS.laneCapUsd.join(' to $')} and the wave cap $${RUN_BOUNDS.waveCapUsd.join(' to $')}`);
  const model = str(raw.model, MODEL_TOKEN, 80);
  if (!model) return no('model must be a plain model id (sonnet, claude-sonnet-5-5)');
  const ideas = ideasOf(raw.ideas);
  if (!ideas) return no(`ideas must be a list of ${RUN_IDEAS.join(', ')}, each at most once`);
  return { ok: true, intent: { kind: 'start-run', repo, mode, ...(base ? { base } : {}), ...(onto ? { onto } : {}), waves, lanes, laneCapUsd, waveCapUsd, model, ideas } };
}
