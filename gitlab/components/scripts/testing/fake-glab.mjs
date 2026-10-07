// Test double for `glab api` (BELAY_GLAB='<node>|fake-glab.mjs'). Answers GET requests from the JSON map in
// $FAKE_GLAB_ROUTES, keyed by the path without its query string; page 2 and later of a list are empty. A write
// (-X POST, PUT...) is answered only when the map has "<METHOD> <path>": its `reply`, and the request (with its JSON body
// from stdin) is appended as one line to $FAKE_GLAB_WRITES, so a test reads what was written. Anything else (a write or
// a path not in the map, another glab command) fails the way glab does: a message on stderr and exit 1.
import fs from 'node:fs';

const argv = process.argv.slice(2);
const routes = JSON.parse(fs.readFileSync(process.env.FAKE_GLAB_ROUTES ?? '', 'utf8'));
const x = argv.indexOf('-X');
const method = x === -1 ? 'GET' : argv[x + 1];
const target = x === -1 ? argv.at(-1) : argv[x + 2];
const [base = '', query = ''] = String(target).split('?');
const fail = () => {
  console.error(`fake glab: ${argv.join(' ')} is not faked`);
  process.exit(1);
};

if (argv[0] !== 'api') fail();
if (method !== 'GET') {
  const route = routes[`${method} ${base}`];
  if (!route) fail();
  const raw = argv.includes('--input') ? fs.readFileSync(0, 'utf8') : '';
  fs.appendFileSync(process.env.FAKE_GLAB_WRITES ?? '', `${JSON.stringify({ method, path: base, body: raw ? JSON.parse(raw) : null })}\n`);
  process.stdout.write(JSON.stringify(route.reply ?? null));
  process.exit(0);
}
if (!(base in routes)) fail();
const page = Number(new URLSearchParams(query).get('page') ?? '1');
process.stdout.write(JSON.stringify(page > 1 ? [] : routes[base]));
