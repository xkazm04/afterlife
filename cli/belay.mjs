#!/usr/bin/env node
// belay - command-line companion of the app: doctor | scan | pair | replay.
// doctor and scan only read. pair prints what it would add to a checkout and writes only with --write; it never
// commits, pushes or opens an MR. The logic is TypeScript (src/server/gitlab, engine/scan, src/server/pair), run here
// through tsx.
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const [, , cmd = 'help'] = process.argv;
const root = fileURLToPath(new URL('..', import.meta.url));

function tsx(name, entry, args = [], cwd = root) {
  let bin;
  try {
    bin = createRequire(import.meta.url).resolve('tsx/cli');
  } catch {
    console.error(`belay ${name} needs tsx (a dev dependency): run \`npm install\` first.`);
    return 2;
  }
  const file = fileURLToPath(new URL(entry, import.meta.url));
  const r = spawnSync(process.execPath, [bin, '--tsconfig', `${root}/tsconfig.json`, file, ...args], { cwd, stdio: 'inherit', env: process.env });
  return r.status ?? 2;
}

const rest = process.argv.slice(3);

switch (cmd) {
  case 'doctor':
    process.exitCode = tsx('doctor', '../src/server/gitlab/doctorCli.ts');
    break;
  case 'scan': {
    // belay scan [<checkout>] [--propose] [--facts <facts.json>]: the checkout defaults to the current directory.
    const dir = rest.find((a, i) => !a.startsWith('--') && rest[i - 1] !== '--facts');
    const args = rest.includes('--facts') ? rest.filter((a) => a !== dir) : ['--dir', dir ?? '.', ...rest.filter((a) => a !== dir)];
    process.exitCode = tsx('scan', '../engine/cli.ts', ['scan', ...args], process.cwd());
    break;
  }
  case 'pair':
    process.exitCode = tsx('pair', '../src/server/pair/pairCli.ts', rest, process.cwd());
    break;
  case 'replay':
    console.log(`belay ${cmd}: not implemented yet`);
    process.exitCode = 2;
    break;
  default:
    console.log('usage: belay doctor | scan [<checkout>] [--propose] [--facts <facts.json>] | pair <checkout> [--group <path>] [--write] | replay <ledger-slice>');
}
