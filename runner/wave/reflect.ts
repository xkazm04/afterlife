// After a wave: one claude call that reads the wave's events and proposes prompt edits. It runs in an empty
// scratch directory (it needs no repo, so it cannot touch one), its text lands next to the run file as
// <wave>.proposals.md, and its usage is emitted as lane.usage with lane "reflect". Best effort: a failed
// reflection costs the wave nothing.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { callClaude } from '../agent/spawn';
import { stepMarker } from './plan';
import type { Log } from './events';

export async function reflect(o: { prompt: string; runFile: string; model: string; timeoutMs: number; log: Log }): Promise<void> {
  const events = fs.readFileSync(o.runFile, 'utf8');
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'belay-reflect-'));
  try {
    const a = await callClaude({ prompt: `${o.prompt}\n\n## The wave's events (jsonl)\n${events}\n${stepMarker('reflect')}`, cwd: scratch, model: o.model, timeoutMs: o.timeoutMs });
    if (a.usage) o.log({ kind: 'lane.usage', lane: 'reflect', model: a.model ?? o.model, ...a.usage, costUsd: a.costUsd ?? 0 });
    if (a.text && !a.timedOut) fs.writeFileSync(o.runFile.replace(/\.jsonl$/, '.proposals.md'), `${a.text.trim()}\n`);
  } catch {
    /* best effort */
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}
