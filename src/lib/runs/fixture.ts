// A run directory's worth of belay.run/0 lines for tests: all five kinds, a finished mergeable wave whose second lane
// never reported usage, a wave still running, and lines that are not events (not JSON, a future schema, an unknown kind).
const base = { v: 'belay.run/0', repo: 'alpha', promptVersion: 'abc123def456' };
const line = (o: object): string => JSON.stringify({ ...base, ...o });

export const WAVE_1: string[] = [
  line({ kind: 'wave.start', ts: '2026-10-17T10:00:00Z', wave: 1, base: 'main', lanes: 2, laneCapUsd: 5, waveCapUsd: 10, model: 'sonnet' }),
  line({ kind: 'lane.start', ts: '2026-10-17T10:00:01Z', wave: 1, lane: 'a', title: 'Fix the flaky retry' }),
  line({ kind: 'lane.start', ts: '2026-10-17T10:00:01Z', wave: 1, lane: 'b', title: 'Bump the lockfile' }),
  line({ kind: 'lane.usage', ts: '2026-10-17T10:03:00Z', wave: 1, lane: 'a', model: 'sonnet', inputTokens: 1000, outputTokens: 500, cacheReadTokens: 200, cacheWriteTokens: 300, costUsd: 0.25 }),
  line({ kind: 'lane.end', ts: '2026-10-17T10:04:00Z', wave: 1, lane: 'a', outcome: 'landed', commits: ['c1', 'c2'], wallSec: 180 }),
  'this is not json',
  line({ kind: 'lane.end', ts: '2026-10-17T10:05:00Z', wave: 1, lane: 'b', outcome: 'parked', commits: [], parkReason: 'needs a person to pick a version', wallSec: 75 }),
  JSON.stringify({ ...base, v: 'belay.run/9', kind: 'wave.end', ts: 'x', wave: 1 }),
  line({ kind: 'wave.pause', ts: '2026-10-17T10:05:30Z', wave: 1 }),
  line({ kind: 'wave.end', ts: '2026-10-17T10:06:00Z', wave: 1, branch: 'belay/wave-1', mergeable: true, costUsd: 0.25 }),
];

export const WAVE_2_RUNNING: string[] = [
  line({ kind: 'wave.start', ts: '2026-10-18T09:00:00Z', wave: 2, base: 'main', lanes: 1, laneCapUsd: 5, waveCapUsd: 10, model: 'sonnet' }),
  line({ kind: 'lane.start', ts: '2026-10-18T09:00:01Z', wave: 2, lane: 'a', title: 'Trim the changelog' }),
  line({ kind: 'lane.usage', ts: '2026-10-18T09:01:00Z', wave: 2, lane: 'a', model: 'sonnet', inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0, costUsd: 0.01 }),
];
