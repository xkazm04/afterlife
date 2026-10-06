// Belay proof engine: `npx tsx engine/cli.ts <cmd>`. Model-free by construction: no network, no LLM, no
// clock except where a command takes one. JSON on stdout, a human summary on stderr, and the exit code:
// 0 pass, 1 fail, 2 inconclusive or error.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { envelopeCommand } from './commands/envelope';
import { gateCommand } from './commands/gate';
import { ledgerCommand } from './commands/ledger';
import { proveCommand } from './commands/prove';
import { tripwireCommand } from './commands/tripwire';
import { EngineError, type CommandResult, type Ctx, type ExitCode } from './core/types';

export interface Io {
  stdout: (s: string) => void;
  stderr: (s: string) => void;
  cwd?: string;
  now?: () => Date;
}

const COMMANDS: Record<string, (argv: readonly string[], ctx: Ctx) => CommandResult> = {
  prove: proveCommand,
  envelope: envelopeCommand,
  gate: gateCommand,
  tripwire: tripwireCommand,
  ledger: ledgerCommand,
};

const USAGE = `usage: engine/cli.ts <command> [options]
  prove --class <ProofClass> --input <file.json> [--policy <trust-policy.yml>]
  envelope --policy <trust-policy.yml> --class <id> --diff <file> [--env <name>]...
  gate --policy <p> --state <tier-state.yml> --class <id> --proof <proof.json> --guardrail <verdict.json>
  tripwire --policy <p> --state <tier-state.yml> --event <event.json>
  ledger append --event <event.json> --chain <events.jsonl> [--write]
exit: 0 pass, 1 fail, 2 inconclusive or error`;

export function main(argv: readonly string[], io: Io = { stdout: (s) => process.stdout.write(s), stderr: (s) => process.stderr.write(s) }): ExitCode {
  const [cmd, ...rest] = argv;
  const run = cmd ? COMMANDS[cmd] : undefined;
  if (!run) {
    io.stderr(`${cmd ? `unknown command "${cmd}"\n` : ''}${USAGE}\n`);
    io.stdout(`${JSON.stringify({ error: cmd ? `unknown command ${cmd}` : 'no command' })}\n`);
    return 2;
  }
  try {
    const r = run(rest, { cwd: io.cwd ?? process.cwd(), now: io.now ?? (() => new Date()) });
    io.stdout(`${JSON.stringify(r.json, null, r.compact ? undefined : 2)}\n`);
    io.stderr(`${r.summary}\n`);
    return r.code;
  } catch (e) {
    const message = e instanceof EngineError ? e.message : `unexpected: ${e instanceof Error ? e.message : String(e)}`;
    io.stdout(`${JSON.stringify({ error: message })}\n`);
    io.stderr(`engine ${cmd}: error: ${message}\n`);
    return 2;
  }
}

const entry = process.argv[1];
if (entry && path.resolve(entry).toLowerCase() === path.resolve(fileURLToPath(import.meta.url)).toLowerCase()) {
  process.exitCode = main(process.argv.slice(2));
}
