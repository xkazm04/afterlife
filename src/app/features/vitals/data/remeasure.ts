'use server';

// The Adjustments band's two re-measures that need no preview, because they write nothing outside Afterlife's own data:
// "Measure passively" (passiveMeasure over the stored runs: a Measurement once both sides have three, else "waiting:
// k of N after") and "Measure locally" (localMeasure: the runner's T3 measurement in throwaway worktrees of the
// project's checkout, minutes long, so it is started in the background and its Measurement shows on a later read).
// Like Refresh they answer only a request addressed to this machine, never on the hosted replay, and only for a
// saved project. Queue N runs is a write as the person and goes through the preview/confirm actions instead.
import { headers } from 'next/headers';
import { refresh } from 'next/cache';
import { notLocal } from '@/server/actions/local';
import { envOf } from '@/server/env/env';
import { loadProjects } from '@/server/discover';
import { localMeasure, passiveMeasure, type MeasureAnswer } from '@/server/vitals';
import { messageOf } from '@/lib/format/error';
import type { RemeasureResult } from '../model/types';

const ID = /^[A-Za-z0-9_-]{1,64}$/;
const KEY = Symbol.for('afterlife.vitals.localMeasures');
const holder = globalThis as unknown as Record<symbol, Set<string> | undefined>;
const running = (): Set<string> => (holder[KEY] ??= new Set());

async function gate(slug: unknown, claimId: unknown): Promise<string | null> {
  if (envOf(process.env, 'MODE') === 'replay') return 'the hosted replay has no real project to measure';
  if (typeof slug !== 'string' || !loadProjects().some((p) => p.slug === slug)) return 'no saved project has that slug';
  if (typeof claimId !== 'string' || !ID.test(claimId)) return 'that is not a claim id';
  return notLocal(await headers());
}

const words = (a: MeasureAnswer): RemeasureResult =>
  a.status === 'measured' ? { ok: true, message: `Measured: ${a.measurement.verdict} · ${a.measurement.reason}` } : a.status === 'waiting' ? { ok: true, message: `Not yet: ${a.message}` } : { ok: false, error: a.reason };

export async function measurePassiveAction(slug: unknown, claimId: unknown): Promise<RemeasureResult> {
  const why = await gate(slug, claimId);
  if (why) return { ok: false, error: why };
  const r = words(await passiveMeasure(slug as string, claimId as string));
  refresh();
  return r;
}

export async function measureLocalAction(slug: unknown, claimId: unknown): Promise<RemeasureResult> {
  const why = await gate(slug, claimId);
  if (why) return { ok: false, error: why };
  const key = `${slug as string}:${claimId as string}`;
  if (running().has(key)) return { ok: true, message: 'Already measuring locally: its result shows here when it is done' };
  running().add(key);
  void localMeasure(slug as string, claimId as string)
    .then((a) => a.status !== 'measured' && console.error(`afterlife: local measure of ${key}: ${a.status === 'refused' ? a.reason : a.message}`), (e: unknown) => console.error(`afterlife: local measure of ${key} failed: ${messageOf(e)}`))
    .finally(() => running().delete(key));
  return { ok: true, message: 'Measuring locally: base and the change, each in a throwaway worktree. Minutes; the result shows here when it is done' };
}
