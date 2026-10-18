// The run file: <runs>/<repo>/<wave>.jsonl, one belay.run/0 event per line, append-only. Every event is
// stamped here (v, ts, repo, wave, promptVersion) so the callers only say what happened.
import fs from 'node:fs';
import path from 'node:path';
import { RUN_SCHEMA, type RunEvent } from '../../src/schemas/run';

type Distribute<T> = T extends unknown ? Omit<T, 'v' | 'ts' | 'repo' | 'wave' | 'promptVersion'> : never;
export type EventBody = Distribute<RunEvent>;
export type Log = (body: EventBody) => void;

export const runFile = (runsDir: string, repo: string, wave: number): string => path.join(runsDir, repo, `${wave}.jsonl`);

export function makeLog(o: { runsDir: string; repo: string; wave: number; promptVersion: string; emit: (e: RunEvent) => void }): Log {
  const file = runFile(o.runsDir, o.repo, o.wave);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  return (body) => {
    const e = { v: RUN_SCHEMA, ts: new Date().toISOString(), repo: o.repo, wave: o.wave, promptVersion: o.promptVersion, ...body } as RunEvent;
    fs.appendFileSync(file, `${JSON.stringify(e)}\n`);
    o.emit(e);
  };
}
