#!/usr/bin/env node
// belay - command-line companion of the app: doctor | run | pair | scan | replay.
// Every write it will ever make prints the exact command first. `doctor` only reads; `run` is the one verb
// that spends: it prints repo, base, caps and model before anything starts, and --dry-run stops right there.
// The logic is TypeScript (src/server/gitlab, runner/), run here through tsx.
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const [, , cmd = 'help', ...rest] = process.argv;
const root = fileURLToPath(new URL('..', import.meta.url));

function viaTsx(verb, entryUrl, args = []) {
  let tsx;
  try {
    tsx = createRequire(import.meta.url).resolve('tsx/cli');
  } catch {
    console.error(`belay ${verb} needs tsx (a dev dependency): run \`npm install\` first.`);
    return 2;
  }
  const entry = fileURLToPath(new URL(entryUrl, import.meta.url));
  const r = spawnSync(process.execPath, [tsx, entry, ...args], { cwd: root, stdio: 'inherit', env: process.env });
  return r.status ?? 2;
}

switch (cmd) {
  case 'doctor':
    process.exitCode = viaTsx('doctor', '../src/server/gitlab/doctorCli.ts');
    break;
  case 'run':
    process.exitCode = viaTsx('run', '../runner/main.ts', rest);
    break;
  case 'pair':
  case 'scan':
  case 'replay':
    console.log(`belay ${cmd}: not implemented yet`);
    process.exitCode = 2;
    break;
  default:
    console.log('usage: belay doctor | run --repo <slug> [--waves n] [--lanes n] [--lane-cap usd] [--wave-cap usd] [--model m] [--fleet file] [--skip-base-gates] [--dry-run] | pair <checkout> | scan [--propose] | replay <ledger-slice>');
}
