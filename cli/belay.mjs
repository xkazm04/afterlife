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
    // belay scan [<checkout>] [--propose] | belay scan --facts <facts.json>: the checkout defaults to the current directory.
    const dir = rest.find((a, i) => !a.startsWith('--') && rest[i - 1] !== '--facts');
    const args = rest.includes('--facts') ? rest.filter((a) => a !== dir) : ['--dir', dir ?? '.', ...rest.filter((a) => a !== dir)];
    process.exitCode = viaTsx('scan', '../engine/cli.ts', ['scan', ...args], process.cwd());
    break;
  }
  case 'pair':
    process.exitCode = viaTsx('pair', '../src/server/pair/pairCli.ts', rest, process.cwd());
    break;
  case 'replay':
    console.log(`belay ${cmd}: not implemented yet`);
    process.exitCode = 2;
    break;
  default:
    console.log('usage: belay doctor | run --repo <slug> [--waves n] [--lanes n] [--lane-cap usd] [--wave-cap usd] [--model m] [--fleet file] [--dry-run] | scan [<checkout>] [--propose] | scan --facts <facts.json> | pair <checkout> [--group <path>] [--write] | replay <ledger-slice>');
}
