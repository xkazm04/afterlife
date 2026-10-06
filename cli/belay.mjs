#!/usr/bin/env node
// belay - command-line companion of the app: doctor | pair | scan | replay.
// Every write it will ever make prints the exact command first; today only `doctor` runs, and it
// only reads. The doctor logic is TypeScript (src/server/gitlab), run here through tsx.
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const [, , cmd = 'help'] = process.argv;
const root = fileURLToPath(new URL('..', import.meta.url));

function doctor() {
  let tsx;
  try {
    tsx = createRequire(import.meta.url).resolve('tsx/cli');
  } catch {
    console.error('belay doctor needs tsx (a dev dependency): run `npm install` first.');
    return 2;
  }
  const entry = fileURLToPath(new URL('../src/server/gitlab/doctorCli.ts', import.meta.url));
  const r = spawnSync(process.execPath, [tsx, entry], { cwd: root, stdio: 'inherit', env: process.env });
  return r.status ?? 2;
}

switch (cmd) {
  case 'doctor':
    process.exitCode = doctor();
    break;
  case 'pair':
  case 'scan':
  case 'replay':
    console.log(`belay ${cmd}: not implemented yet`);
    process.exitCode = 2;
    break;
  default:
    console.log('usage: belay doctor | pair <checkout> | scan [--propose] | replay <ledger-slice>');
}
