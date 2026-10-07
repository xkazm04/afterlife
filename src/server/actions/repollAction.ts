'use server';

// Re-poll, the one read a screen asks the server for: one poll cycle of the live runtime, then the current route renders
// again from the fresh snapshot in the same round trip (`refresh` from next/cache). It writes nothing to GitLab: a poll
// only reads. Demo mode has nothing to poll, and its screens keep their own simulation.
import { refresh } from 'next/cache';
import { readDataConfig } from '@/server/data/config';
import { readyRuntime } from '@/server/data/live/runtime';
import { repollProject, type RepollResult } from './repoll';

export async function repollAction(projectId: unknown): Promise<RepollResult> {
  if (readDataConfig().mode !== 'live') return { ok: false, reason: 'demo mode has nothing to poll' };
  const { result, polled } = await repollProject(readyRuntime(), projectId);
  if (polled) refresh();
  return result;
}
