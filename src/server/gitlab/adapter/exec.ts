// The only place that starts a process. execFile, never a shell, so no argument is parsed twice.
import { execFile } from 'node:child_process';
import { GitLabError } from '../errors';

export interface ExecResult { code: number; stdout: string; stderr: string }
/** Injected in tests. Resolves on any exit code; rejects only when the binary cannot start. */
export type ExecFn = (file: string, args: readonly string[]) => Promise<ExecResult>;

const MiB = 1024 * 1024;
const MAX_BUFFER = 64 * MiB;

export const defaultExec: ExecFn = (file, args) =>
  new Promise((resolve, reject) => {
    execFile(file, [...args], { encoding: 'utf8', windowsHide: true, maxBuffer: MAX_BUFFER, timeout: 60_000 }, (err, stdout, stderr) => {
      if (!err) return resolve({ code: 0, stdout, stderr });
      const e = err as NodeJS.ErrnoException & { killed?: boolean };
      if (typeof e.code === 'number') return resolve({ code: e.code, stdout, stderr });
      if (e.killed) return resolve({ code: 124, stdout, stderr: `${stderr}\nglab: i/o timeout` });
      if (e.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER') {
        return reject(new GitLabError('api', `glab output exceeded the ${MAX_BUFFER / MiB} MiB cap and was cut off`, file));
      }
      reject(new GitLabError('binary', `cannot start ${file}: ${e.code ?? e.message}`, file));
    });
  });
