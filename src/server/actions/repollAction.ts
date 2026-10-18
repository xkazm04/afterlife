'use server';

// Re-poll, the one read a screen asks the server for: one poll cycle of the live runtime, then the current route renders
// again from the fresh snapshot in the same round trip (`refresh` from next/cache). It writes nothing to GitLab: a poll
// only reads. Demo mode has nothing to poll, and its screens keep their own simulation. Like the writes, it answers only
// a request addressed to this machine (local.ts): a poll reads the whole group as the operator.
import { headers } from 'next/headers';
import { refresh } from 'next/cache';
import { readDataConfig } from '@/server/data/config';
import { readyRuntime } from '@/server/data/live/runtime';
import { notLocal } from './local';
import { repollGroup, repollProject, type GroupRepollResult, type RepollResult } from './repoll';

export async function repollAction(projectId: unknown): Promise<RepollResult> {
  if (readDataConfig().mode !== 'live') return { ok: false, reason: 'demo mode has nothing to poll' };
  const away = notLocal(await headers());
  if (away) return { ok: false, reason: away };
  const { result, polled } = await repollProject(readyRuntime(), projectId);
  if (polled) refresh();
  return result;
}

/** The status bar's Re-poll, from any screen: one cycle of the whole group, the same checks and the same gap. */
export async function repollGroupAction(): Promise<GroupRepollResult> {
  if (readDataConfig().mode !== 'live') return { ok: false, reason: 'demo mode has nothing to poll' };
  const away = notLocal(await headers());
  if (away) return { ok: false, reason: away };
  const { result, polled } = await repollGroup(readyRuntime());
  if (polled) refresh();
  return result;
}
