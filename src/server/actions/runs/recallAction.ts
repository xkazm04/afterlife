'use server';

// "Did it run?", for a confirm that got no answer: what the run journal (journal.ts) recorded under its previewId. It writes
// nothing and plans nothing. Like the writes, a live answer goes only to a request addressed to this machine (local.ts):
// any other caller, or a server not yet ready, gets unknown. Demo mode never runs anything, so it answers never.
import { headers } from 'next/headers';
import { actionDeps } from '../deps';
import { notLocal } from '../local';
import { recallRun, type Recall } from './journal';

export async function recallAction(previewId: unknown): Promise<Recall> {
  const deps = actionDeps();
  if (!deps) return { kind: 'unknown' };
  if (deps.mode === 'live' && notLocal(await headers())) return { kind: 'unknown' };
  return recallRun(deps, previewId);
}
