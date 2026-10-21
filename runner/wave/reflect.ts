// After a wave: one claude call that reads the wave's events (a frontier repo's wave.tech first) and proposes
// prompt edits. It runs in an empty
// scratch directory (it needs no repo, so it cannot touch one), its text lands next to the run file as
// <wave>.proposals.md, and its usage is emitted as lane.usage with lane "reflect". Best effort: a failed
// reflection costs the wave nothing.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { callClaude } from '../agent/spawn';
import { stepMarker } from './plan';
import type { Log } from './events';

export interface ReflectInput {
  prompt: string;
  runFile: string;
  model: string;
  timeoutMs: number;
  log: Log;
  /** The lanes' final texts (WaveResult.notes). */
  notes: readonly string[];
  /** The prompts the wave ran with, so a proposal can be a diff against them. */
  current: { plan: string; lane: string; frontier?: string };
}

export async function reflect(o: ReflectInput): Promise<void> {
  const events = fs.readFileSync(o.runFile, 'utf8');
  // T3 first (reflect.md): a frontier repo's wave.tech, when the wave measured one.
  const tech = events.split(/\r?\n/).filter((l) => l.includes('"kind":"wave.tech"'));
  const context = [
    ...(tech.length ? [`## Technology metrics (wave.tech: read this first)\n${tech.join('\n')}`] : []),
    `## The wave's events (jsonl)\n${events}`,
    `## Lane result texts\n${o.notes.join('\n\n') || '(no lanes ran)'}`,
    `## plan.md as run\n${o.current.plan}`,
    `## lane.md as run\n${o.current.lane}`,
    // The frontier brief only when a frontier lane ran: the reflection may sharpen it as its one change.
    ...(o.current.frontier && events.includes('"frontier":true') ? [`## frontier.md as run\n${o.current.frontier}`] : []),
  ].join('\n\n');
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'belay-reflect-'));
  try {
    const a = await callClaude({ prompt: `${o.prompt}\n\n${context}\n${stepMarker('reflect')}`, cwd: scratch, model: o.model, timeoutMs: o.timeoutMs, permissions: { step: 'reflect' } });
    if (a.usage) o.log({ kind: 'lane.usage', lane: 'reflect', model: a.model ?? o.model, ...a.usage, costUsd: a.costUsd ?? 0, ...(a.sessionId ? { sessionId: a.sessionId } : {}) });
    if (a.text && !a.timedOut) fs.writeFileSync(o.runFile.replace(/\.jsonl$/, '.proposals.md'), `${a.text.trim()}\n`);
  } catch {
    /* best effort */
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}
