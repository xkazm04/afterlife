'use server';

// Setup's Re-probe (the afterlife doctor) and a step's verify, in live mode: the same reads /setup made when it loaded,
// made again. Read only: nothing is written, to GitLab or to the index. Like verifyArmAction, it answers only a request
// addressed to this machine (local.ts), because it reads as the operator's glab login. Demo mode reads nothing: the
// screen keeps its simulation there and never asks.
import { headers } from 'next/headers';
import { notLocal } from '@/server/actions/local';
import { getDataSource } from '../select';
import type { SetupReread } from './types';

export async function rereadSetupAction(part: unknown): Promise<SetupReread> {
  if (part !== 'doctor' && part !== 'steps') return { status: 'refused', reason: 'Setup re-reads the doctor or the steps only' };
  let reads;
  try {
    reads = getDataSource().setupReads();
  } catch (e) {
    // The source says which: a first poll still running, or a start that failed and is being retried (select.ts).
    return { status: 'refused', reason: e instanceof Error ? e.message : 'live mode has not finished its first poll; try again in a moment' };
  }
  if (!reads) return { status: 'refused', reason: 'demo mode: Afterlife reads nothing from GitLab' };
  const away = notLocal(await headers());
  if (away) return { status: 'refused', reason: away };
  try {
    return part === 'doctor' ? { status: 'doctor', doctor: await reads.doctor() } : { status: 'steps', steps: await reads.steps() };
  } catch (e) {
    // Answered here, not thrown: a thrown action reaches a production client as Next's masked sentence and a digest.
    console.error(`afterlife: setup re-read of the ${part} failed`, e);
    return { status: 'refused', reason: `the ${part} could not be read: ${e instanceof Error ? e.message : 'unknown error'}` };
  }
}
