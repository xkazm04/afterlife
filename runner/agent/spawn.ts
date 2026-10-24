// One headless claude call: `claude -p --output-format stream-json --verbose --model <m> --permission-mode <mode>
// --tools <list> --strict-mcp-config --settings <file>`, the prompt on stdin, cwd = the worktree it may edit. What
// the call may do comes from its PermissionProfile (permissions.ts), written to a settings file in a fresh temp
// dir that is removed after the call. This file and its siblings under runner/ are the ONLY code in the repo that
// touches the Anthropic key: claude gets agentEnv() (its own credentials, no other secret), every other child the
// scrubbed childEnv(), so the key reaches claude and nothing else - not the gates or git hooks a lane agent can
// rewrite. Bash commands a lane is allowed run as claude's children, and agentEnv() sets CLAUDE_CODE_SUBPROCESS_ENV_SCRUB
// so claude strips its own credentials from them (and from hooks): they get agentEnv() minus the key. The user-scope
// settings (~/.claude/settings.json: its hooks, plugins, allow rules) are not loaded: a lane's tool calls must not
// reach the operator's own hooks, and the operator's allow list must not widen the profile. BELAY_CLAUDE_BIN swaps
// the binary (tests).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { agentEnv, runProc } from '../proc/proc';
import { permissionArgs, type PermissionProfile } from './permissions';
import { parseStream, type StreamResult } from './stream';

/** Windows re-parses argv through cmd.exe for claude.cmd, so every argument must stay a plain token. */
export const MODEL_TOKEN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
export const PATH_TOKEN = /^[A-Za-z0-9_:\\/.~-]+$/;
const TOOLS_TOKEN = /^[A-Za-z,]*$/;
/** A claude session id (a uuid; the test fake's are `fake-<step>-<lane>`). */
const SESSION_TOKEN = /^[A-Za-z0-9][A-Za-z0-9-]{0,127}$/;

export interface AgentCall {
  prompt: string;
  cwd: string;
  model: string;
  timeoutMs: number;
  permissions: PermissionProfile;
  /** Resume this claude session (`--resume <id>`): the lane's repair turn continues the session that did the work. */
  resume?: string;
}

export interface AgentOutcome extends StreamResult {
  timedOut: boolean;
  exitCode: number | null;
  stderr: string;
}

/** The argv after the binary, given the settings file's path. Pure, so a test pins it. */
export function claudeArgs(model: string, permissions: PermissionProfile, settingsFile: string, resume?: string): string[] {
  if (!MODEL_TOKEN.test(model)) throw new Error(`runner: invalid model "${model}"`);
  if (resume !== undefined && !SESSION_TOKEN.test(resume)) throw new Error(`runner: invalid session id "${resume}"`);
  if (!PATH_TOKEN.test(settingsFile)) throw new Error(`runner: settings path is not shell-safe: ${settingsFile} (set TMP/TEMP to a plain path)`);
  const p = permissionArgs(permissions);
  if (!TOOLS_TOKEN.test(p.tools)) throw new Error(`runner: invalid tool list "${p.tools}"`);
  // `--tools=` (one token) is the empty list: a bare "" would vanish on its way through cmd.exe.
  return ['-p', '--output-format', 'stream-json', '--verbose', '--model', model, '--permission-mode', p.mode, `--tools=${p.tools}`, '--strict-mcp-config', '--setting-sources', 'project,local', '--settings', settingsFile, ...(resume ? ['--resume', resume] : [])];
}

/**
 * One cmd.exe command line for claude.cmd. Passing argv with shell:true is what node deprecates (DEP0190: it
 * only concatenates), so the line is built here, where every argument is already checked to be a plain token;
 * a bin path with spaces is quoted, one with a quote or a cmd metacharacter is refused.
 */
export function shellLine(bin: string, args: readonly string[]): string {
  if (/["%&|<>^\r\n]/.test(bin)) throw new Error(`runner: claude binary path is not shell-safe: ${bin}`);
  const bad = args.find((a) => !/^[A-Za-z0-9_:\\/.,=~-]+$/.test(a));
  if (bad !== undefined) throw new Error(`runner: argument is not shell-safe: ${bad}`);
  return [/\s/.test(bin) ? `"${bin}"` : bin, ...args].join(' ');
}

export async function callClaude(call: AgentCall): Promise<AgentOutcome> {
  const bin = process.env.BELAY_CLAUDE_BIN || 'claude';
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'belay-perm-'));
  try {
    const settingsFile = path.join(dir, 'settings.json');
    const args = claudeArgs(call.model, call.permissions, settingsFile, call.resume);
    fs.writeFileSync(settingsFile, `${JSON.stringify(permissionArgs(call.permissions).settings, null, 2)}\n`);
    // A script bin (the test fake) runs under this node; a real claude needs a shell on Windows (claude.cmd).
    const script = /\.(c|m)?js$/.test(bin);
    const env = agentEnv();
    const io = { cwd: call.cwd, input: call.prompt, timeoutMs: call.timeoutMs, env };
    const r = script
      ? await runProc(process.execPath, [bin, ...args], io)
      : process.platform === 'win32'
        ? await runProc(shellLine(bin, args), [], { ...io, shell: true })
        : await runProc(bin, args, io);
    return { ...parseStream(r.stdout), timedOut: r.timedOut, exitCode: r.code, stderr: r.stderr };
  } finally {
    removeScratch(dir);
  }
}

/**
 * Removes a temp dir the runner made for a claude call. On Windows a child just killed (taskkill) can still hold it
 * and rmSync throws EPERM: it is retried, and a dir that still will not go is printed, never thrown - a throw from a
 * finally would replace the call's result, and with it the cost the caps are counted from.
 */
export function removeScratch(dir: string): void {
  try {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  } catch (e) {
    console.error(`runner: could not remove ${dir}: ${e instanceof Error ? e.message : String(e)}`);
  }
}
