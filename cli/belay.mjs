#!/usr/bin/env node
// belay - command-line companion of the app: doctor | pair | scan | replay.
// Every write it will ever make prints the exact command first; today only `doctor` runs.
import { execFileSync } from 'node:child_process';

const [, , cmd = 'help'] = process.argv;

function probe(bin, args) {
  try {
    return { ok: true, out: execFileSync(bin, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim().split('\n')[0] };
  } catch (e) {
    return { ok: false, out: String(e.stderr || e.message).trim().split('\n')[0] };
  }
}

function doctor() {
  // Local preflight only. GitLab capability probes (flows, service accounts, vulnerability API,
  // deployment approvals) land with the GitLab client; until then they print as unknown.
  const rows = [
    ['git', probe('git', ['--version'])],
    ['glab', probe('glab', ['--version'])],
    ['glab auth', probe('glab', ['auth', 'status'])],
    ['node', { ok: true, out: process.version }],
  ];
  for (const [name, r] of rows) console.log(`${r.ok ? 'available  ' : 'unavailable'}  ${name.padEnd(10)} ${r.out}`);
  for (const cap of ['custom flows', 'service accounts', 'vulnerability API', 'deployment approvals']) {
    console.log(`unknown      ${cap.padEnd(10)} not probed yet`);
  }
}

switch (cmd) {
  case 'doctor':
    doctor();
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
