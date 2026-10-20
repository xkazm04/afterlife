// One headless claude call: `claude -p --output-format stream-json --verbose --model <m> --permission-mode <mode>
// --tools <list> --strict-mcp-config --settings <file>`, the prompt on stdin, cwd = the worktree it may edit. What
// the call may do comes from its PermissionProfile (permissions.ts), written to a settings file in a fresh temp
// dir that is removed after the call. This file and its siblings under runner/ are the ONLY code in the repo that
// touches the Anthropic key: claude gets agentEnv() (its own credentials, no other secret), every other child the
// scrubbed childEnv(), so the key reaches claude and nothing else - not the gates or git hooks a lane agent can
// rewrite. Bash commands a lane is allowed run as claude's children, so with agentEnv(). BELAY_CLAUDE_BIN swaps
// the binary (tests).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { agentEnv, runProc } from '../proc/proc';
import { permissionArgs, type PermissionProfile } from './permissions';
import { parseStream, type StreamResult } from './stream';

/** Windows re-parses argv through cmd.exe for claude.cmd, so every argument must stay a plain token. */
const MODEL_TOKEN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
export const PATH_TOKEN = /^[A-Za-z0-9_:\\/.~-]+$/;
const TOOLS_TOKEN = /^[A-Za-z,]*$/;

export interface AgentCall {
  prompt: string;
  cwd: string;
  model: string;
  timeoutMs: number;
  permissions: PermissionProfile;
}

export interface AgentOutcome extends StreamResult {
  timedOut: boolean;
  exitCode: number | null;
  stderr: string;
}

/** The argv after the binary, given the settings file's path. Pure, so a test pins it. */
export function claudeArgs(model: string, permissions: PermissionProfile, settingsFile: string): string[] {
  if (!MODEL_TOKEN.test(model)) throw new Error(`runner: invalid model "${model}"`);
  if (!PATH_TOKEN.test(settingsFile)) throw new Error(`runner: settings path is not shell-safe: ${settingsFile} (set TMP/TEMP to a plain path)`);
  const p = permissionArgs(permissions);
  if (!TOOLS_TOKEN.test(p.tools)) throw new Error(`runner: invalid tool list "${p.tools}"`);
  // `--tools=` (one token) is the empty list: a bare "" would vanish on its way through cmd.exe.
  return ['-p', '--output-format', 'stream-json', '--verbose', '--model', model, '--permission-mode', p.mode, `--tools=${p.tools}`, '--strict-mcp-config', '--settings', settingsFile];
}

export async function callClaude(call: AgentCall): Promise<AgentOutcome> {
  const bin = process.env.BELAY_CLAUDE_BIN || 'claude';
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'belay-perm-'));
  try {
    const settingsFile = path.join(dir, 'settings.json');
    const args = claudeArgs(call.model, call.permissions, settingsFile);
    fs.writeFileSync(settingsFile, `${JSON.stringify(permissionArgs(call.permissions).settings, null, 2)}\n`);
    // A script bin (the test fake) runs under this node; a real claude needs a shell on Windows (claude.cmd).
    const script = /\.(c|m)?js$/.test(bin);
    const env = agentEnv();
    const r = script
      ? await runProc(process.execPath, [bin, ...args], { cwd: call.cwd, input: call.prompt, timeoutMs: call.timeoutMs, env })
      : await runProc(bin, args, { cwd: call.cwd, input: call.prompt, timeoutMs: call.timeoutMs, env, shell: process.platform === 'win32' });
    return { ...parseStream(r.stdout), timedOut: r.timedOut, exitCode: r.code, stderr: r.stderr };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
