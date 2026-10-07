// Appends events to belay-ledger/events/<project-id>.jsonl. `--event f.json` or `--events dir` (every *.json, in name order).
// The engine does the hashing (`ledger append --event --chain`); this only moves the file, then makes ONE commit.
// A broken or empty engine reply is an error, never a guess. `--key k` adds a `Belay-Head: k` line to the commit message:
// belay-apply reads the ledger file's history for it, so it appends once per project, MR and head.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { arg, die } from '../lib/lib.mjs';
import { engine } from '../lib/engine.mjs';
import { fileHead, writeFile } from '../lib/repo-write.mjs';

const project = arg('project') ?? die('missing --project (the belay-ledger path)');
const branch = arg('branch', 'main');
const file = arg('path', `events/${process.env.CI_PROJECT_ID}.jsonl`);
const dir = arg('events');
const files = dir
  ? fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => path.join(dir, f)) : []
  : [arg('event') ?? die('missing --event or --events')];
if (files.length === 0) {
  console.error('belay: no events to append');
  process.exit(0);
}

// A 404 starts a new chain; any other failed read dies here with GitLab's message, and nothing is written.
let head;
try {
  head = fileHead(project, file, branch);
} catch (e) {
  die(`cannot read ${file} from ${project} (${e.message}): nothing committed`);
}
const original = head?.content ?? null;
let chain = original ? original.replace(/\n*$/, '\n') : '';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'belay-ledger-'));
const titles = [];
for (const f of files) {
  fs.writeFileSync(path.join(tmp, 'events.jsonl'), chain);
  const r = engine(['ledger', 'append', '--event', path.resolve(f), '--chain', path.join(tmp, 'events.jsonl')]);
  if (r.code !== 0) die(`engine ledger append exited ${r.code} for ${f}`, r.code === 1 ? 1 : 2);
  let parsed;
  try {
    parsed = JSON.parse(r.stdout.trim());
  } catch {
    die('engine ledger append did not print one JSON line');
  }
  const before = chain.split('\n').filter(Boolean).length;
  if (parsed.seq !== before + 1) die(`ledger seq ${parsed.seq} does not follow ${before} existing events`);
  chain += `${r.stdout.trim()}\n`;
  titles.push(`${parsed.kind} #${parsed.seq}`);
}

// Writes may use a different token from reads (BELAY_LEDGER_TOKEN, named by --write-token-var).
const writeToken = process.env[arg('write-token-var', 'BELAY_BOT_TOKEN')];
if (writeToken) process.env.GITLAB_TOKEN = writeToken;
writeFile({
  project,
  branch,
  path: file,
  content: chain,
  exists: head !== null,
  lastCommitId: head?.lastCommitId,
  message: `ledger: ${titles.join(', ')}\n\n${arg('key') ? `Belay-Head: ${arg('key')}\n\n` : ''}[skip ci]`,
  mode: arg('mode', 'commit'),
});
console.error(`belay: ${file} now has ${chain.split('\n').filter(Boolean).length} events`);
