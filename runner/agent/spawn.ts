// One headless claude call: `claude -p --output-format stream-json --verbose --model <m> --permission-mode
// acceptEdits`, the prompt on stdin, cwd = the worktree it may edit. This file and its siblings under
// runner/ are the ONLY code in the repo that touches the Anthropic key: claude gets agentEnv() (its own
// credentials, no other secret), every other child the scrubbed childEnv(), so the key reaches claude and
// nothing else - not the gates or git hooks a lane agent can rewrite. BELAY_CLAUDE_BIN swaps the binary (tests).
import { agentEnv, runProc } from '../proc/proc';
import { parseStream, type StreamResult } from './stream';

/** Windows re-parses argv through cmd.exe for claude.cmd, so the model must stay a plain token. */
const MODEL_TOKEN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;

export interface AgentCall {
  prompt: string;
  cwd: string;
  model: string;
  timeoutMs: number;
}

export interface AgentOutcome extends StreamResult {
  timedOut: boolean;
  exitCode: number | null;
  stderr: string;
}

export async function callClaude(call: AgentCall): Promise<AgentOutcome> {
  if (!MODEL_TOKEN.test(call.model)) throw new Error(`runner: invalid model "${call.model}"`);
  const bin = process.env.BELAY_CLAUDE_BIN || 'claude';
  const args = ['-p', '--output-format', 'stream-json', '--verbose', '--model', call.model, '--permission-mode', 'acceptEdits'];
  // A script bin (the test fake) runs under this node; a real claude needs a shell on Windows (claude.cmd).
  const script = /\.(c|m)?js$/.test(bin);
  const env = agentEnv();
  const r = script
    ? await runProc(process.execPath, [bin, ...args], { cwd: call.cwd, input: call.prompt, timeoutMs: call.timeoutMs, env })
    : await runProc(bin, args, { cwd: call.cwd, input: call.prompt, timeoutMs: call.timeoutMs, env, shell: process.platform === 'win32' });
  return { ...parseStream(r.stdout), timedOut: r.timedOut, exitCode: r.code, stderr: r.stderr };
}
