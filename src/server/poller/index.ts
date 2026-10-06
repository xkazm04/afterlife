// The poller: GitLab -> index. Server-only. `runPollCycle` is the unit of work; `startScheduler` repeats it.
import 'server-only';

export { allows, readPollerConfig, type AuthorRule, type PollerConfig } from './config';
export { runPollCycle, type CycleOptions, type CycleResult } from './cycle';
export { createMemory, type PollMemory } from './state';
export { pollIntervalMs, startScheduler, type Scheduler } from './scheduler';
export type { ProjectPoll } from './project';
