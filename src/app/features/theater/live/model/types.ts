// The live film's plain shapes. The payload is what GET /api/runs returns: exactly readRuns()'s RunsData, plus what the
// fold drops and the live view needs (the newest event's ts, the wave cap, the planned lane count, each lane's start).
import type { RunLane, RunsData } from '@/lib/runs/types';

export interface WaveMeta {
  /** ts of the newest event in the wave's file: is the runner still talking. */
  lastEventAt: string;
  waveCapUsd?: number;
  /** wave.start's lane count: the m of lane n/m. */
  lanesPlanned?: number;
  laneStartedAt: Record<string, string>;
}

/** Keyed `<repo>/<wave>` (waveKey). Only each repo's newest wave is read. */
export interface LivePayload extends RunsData {
  meta: Record<string, WaveMeta>;
  /** Server clock (ms) when read: the first render's now, so server and client markup agree. */
  generatedAt: number;
}

export const waveKey = (repo: string, wave: number): string => `${repo}/${wave}`;

/** running: a wave with no wave.end; last: none running, the newest finished wave; none: no wave at all. */
export type LivePhase = 'running' | 'last' | 'none';

export interface LiveView {
  phase: LivePhase;
  repo?: string;
  wave?: number;
  /** Quiet for over STALE_MS while the wave runs: the frame is frozen, never animated on. */
  stale: boolean;
  lanesTotal: number;
  lanesDone: number;
  /** 1-based position of the current lane among the wave's lanes. */
  laneN?: number;
  current?: RunLane;
  /** Seconds the current lane has run; frozen at the last event when stale. */
  elapsedSec?: number;
  landed: number;
  parked: number;
  /** failed + timeout + budget: every lane that ended without landing or parking. */
  failed: number;
  costUsd?: number;
  capUsd?: number;
  /** Finished waves (all repos) whose branch is mergeable. */
  mergeable: number;
  /** Ended lanes, newest first. */
  finished: RunLane[];
}
