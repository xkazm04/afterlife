#!/usr/bin/env node
// belay - command-line companion of the app: doctor | run | scan | pair | replay.
// Every write it will ever make prints the exact command first. `doctor` and `scan` only read; `pair` prints what it would
// add to a checkout and writes only with --write (it never commits, pushes or opens an MR); `run` is the one verb that
// spends: it prints repo, base, caps and model before anything starts, and --dry-run stops right there.
// The logic is TypeScript (src/server/gitlab, engine/scan, src/server/pair, runner/), run here through tsx.
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const [, , cmd = 'help', ...rest] = process.argv;
const USAGE = 'usage: belay doctor | run --repo <slug> [--waves n] [--lanes n] [--lane-cap usd] [--wave-cap usd] [--model m] [--fleet file] [--skip-base-gates] [--dry-run] | scan [<checkout>] [--propose] | scan --facts <facts.json> | pair <checkout> [--group <path>] [--pack-version v] [--engine-ref ref] [--write] | replay <ledger-slice>';
const root = fileURLToPath(new URL('..', import.meta.url));

/** Runs a TypeScript entry through tsx. `cwd` is where it runs (scan and pair read the caller's checkout); the app's
 * tsconfig is named so its path aliases resolve from anywhere. */
function viaTsx(verb, entryUrl, args = [], cwd = root) {
  let tsx;
  try {
    tsx = createRequire(import.meta.url).resolve('tsx/cli');
  } catch {
    console.error(`belay ${verb} needs tsx (a dev dependency): run \`npm install\` first.`);
    return 2;
  }
  const entry = fileURLToPath(new URL(entryUrl, import.meta.url));
  const r = spawnSync(process.execPath, [tsx, '--tsconfig', `${root}/tsconfig.json`, entry, ...args], { cwd, stdio: 'inherit', env: process.env });
  return r.status ?? 2;
}

switch (cmd) {
  case 'doctor':
    process.exitCode = viaTsx('doctor', '../src/server/gitlab/doctorCli.ts');
    break;
  case 'run':
    process.exitCode = viaTsx('run', '../runner/main.ts', rest);
    break;
  case 'scan': {
    // belay scan [<checkout>] [--propose] | belay scan --dir <checkout> | belay scan --facts <facts.json>: the checkout
    // defaults to the current directory. An explicit --dir or --facts passes through; only a bare positional is wrapped.
    const valued = ['--facts', '--dir'];
    const at = rest.findIndex((a, i) => !a.startsWith('--') && !valued.includes(rest[i - 1]));
    const others = rest.filter((_, i) => i !== at);
    const args = rest.some((a) => valued.includes(a)) ? others : ['--dir', at < 0 ? '.' : rest[at], ...others];
    process.exitCode = viaTsx('scan', '../engine/cli.ts', ['scan', ...args], process.cwd());
    break;
  }
  case 'pair':
    process.exitCode = viaTsx('pair', '../src/server/pair/pairCli.ts', rest, process.cwd());
    break;
  case 'replay':
    console.error(`belay ${cmd}: not implemented yet`);
    process.exitCode = 2;
    break;
  case 'help':
  case '--help':
  case '-h':
    console.log(USAGE);
    break;
  default:
    // A typo is a failure, as in engine/cli.ts: a script that calls `belay doctr` must not read a pass.
    console.error(`belay: unknown command "${cmd}"\n${USAGE}`);
    process.exitCode = 2;
}
