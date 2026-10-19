// The live film's frame, folded from the polled payload and an INJECTED clock (so stale detection is testable).
// Header facts answer: running (repo, wave, lane n/m), doing what, going well, needs me. Nothing is invented: an absent
// figure stays absent, and a quiet runner freezes the frame (stale) instead of letting the elapsed clock run on.
import type { RunLane, RunWave } from '@/lib/runs/types';
import { waveKey, type LivePayload, type LiveView, type WaveMeta } from './types';

export const STALE_MS = 30_000;
const RAIL = 8;

export const isStale = (lastEventAt: string | undefined, now: number): boolean => {
  const t = lastEventAt === undefined ? NaN : Date.parse(lastEventAt);
  return Number.isFinite(t) && now - t > STALE_MS;
};

const newest = (ws: RunWave[], at: (w: RunWave) => string | undefined): RunWave | undefined => [...ws].sort((a, b) => (at(b) ?? '').localeCompare(at(a) ?? ''))[0];

/** The lane to feature: the open lane that started last. */
function currentLane(w: RunWave, meta: WaveMeta | undefined): RunLane | undefined {
  const open = w.lanes.filter((l) => !l.outcome);
  return [...open].sort((a, b) => (meta?.laneStartedAt[a.lane] ?? '').localeCompare(meta?.laneStartedAt[b.lane] ?? '')).at(-1);
}

export function hasRunningWave(p: Pick<LivePayload, 'repos'>): boolean {
  return p.repos.some((r) => r.waves.some((w) => w.running));
}

/** A finished wave the URL names (`?repo=&wave=`): the view then shows it, not the running or newest one. */
export interface WaveFocus {
  repo: string;
  wave: number;
}

export function hasFinishedWave(p: Pick<LivePayload, 'repos'>, f: WaveFocus): boolean {
  return p.repos.some((r) => r.waves.some((w) => w.repo === f.repo && w.wave === f.wave && !w.running && w.endedAt !== undefined));
}

export function selectLive(p: LivePayload, now: number, focus?: WaveFocus): LiveView {
  const waves = p.repos.flatMap((r) => r.waves);
  const mergeable = waves.filter((w) => !w.running && w.mergeable).length;
  const replayable = waves
    .filter((x) => !x.running && x.endedAt !== undefined)
    .sort((a, b) => (b.endedAt ?? '').localeCompare(a.endedAt ?? ''))
    .map((x) => ({ repo: x.repo, wave: x.wave }));
  const running = newest(waves.filter((w) => w.running), (w) => w.startedAt);
  const focused = focus && hasFinishedWave(p, focus) ? waves.find((x) => x.repo === focus.repo && x.wave === focus.wave) : undefined;
  const w = focused ?? running ?? newest(waves.filter((x) => x.endedAt !== undefined), (x) => x.endedAt);
  if (!w) return { phase: 'none', stale: false, lanesTotal: 0, lanesDone: 0, landed: 0, parked: 0, failed: 0, mergeable, finished: [], replayable: [] };
  const meta = p.meta[waveKey(w.repo, w.wave)];
  const stale = w.running && isStale(meta?.lastEventAt ?? w.startedAt, now);
  const current = w.running ? currentLane(w, meta) : undefined;
  const view: LiveView = {
    phase: w.running ? 'running' : 'last',
    repo: w.repo,
    wave: w.wave,
    stale,
    lanesTotal: meta?.lanesPlanned ?? w.lanes.length,
    lanesDone: w.lanes.length - w.open,
    landed: w.counts.landed,
    parked: w.counts.parked,
    failed: w.counts.failed + w.counts.timeout + w.counts.budget,
    mergeable,
    replayable,
    finished: w.lanes.filter((l) => l.outcome).reverse().slice(0, RAIL),
  };
  if (current) {
    view.current = current;
    view.laneN = w.lanes.indexOf(current) + 1;
    const from = Date.parse(meta?.laneStartedAt[current.lane] ?? '');
    const to = stale ? Date.parse(meta?.lastEventAt ?? '') : now;
    if (Number.isFinite(from) && Number.isFinite(to)) view.elapsedSec = Math.max(0, (to - from) / 1000);
  }
  if (w.costUsd !== undefined) view.costUsd = w.costUsd;
  if (meta?.waveCapUsd !== undefined) view.capUsd = meta.waveCapUsd;
  return view;
}
