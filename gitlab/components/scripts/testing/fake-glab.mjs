// Test double for `glab api` (BELAY_GLAB='<node>|fake-glab.mjs'). Answers GET requests from the JSON map in
// $FAKE_GLAB_ROUTES, keyed by the path without its query string; page 2 and later of a list are empty. A write
// (-X POST, PUT...) is answered only when the map has "<METHOD> <path>": its `reply`, and the request (with its JSON body
// from stdin) is appended as one line to $FAKE_GLAB_WRITES, so a test reads what was written. Its optional `current`
// ({file_path: last commit id}) makes it refuse a stale last_commit_id the way GitLab does. Anything else (a write or
// a path not in the map, another glab command) fails the way glab does: a message on stderr and exit 1.
// `glab mr note create | update | approve | merge` (what post-proof and apply-gate run) are writes too: each is recorded as
// `{method: "GLAB", path: "mr <command>", body: {iid, repo, message, label, unlabel, sha}}`, unless the map answers
// "GLAB mr <command>" with an `__http` error. A GET route `{"__raw": "text"}` answers with the text itself (a raw file or
// an artifact), and every GET is appended to $FAKE_GLAB_READS when it is set, so a test can say what was never read.
// A GET route `{"__pages": [[...], [...]]}` answers page n with its nth list (empty past the last), for a list past a page cap.
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

// A route answering `{ "__http": <status>, "message": "..." }` fails the way glab does on an HTTP error: the body on
// stdout, "glab: <message> (HTTP <status>)" on stderr, exit 1. Nothing is recorded as written.
const httpError = (route) => {
  if (!route || typeof route !== 'object' || typeof route.__http !== 'number') return;
  const message = route.message ?? `${route.__http} error`;
  process.stdout.write(JSON.stringify({ message }));
  console.error(`glab: ${message} (HTTP ${route.__http})`);
  process.exit(1);
};

if (argv[0] === 'mr' && ['note', 'update', 'approve', 'merge'].includes(argv[1])) {
  const sub = argv[1] === 'note' ? `note ${argv[2]}` : argv[1];
  httpError(routes[`GLAB mr ${sub}`]);
  const at = (flag) => (argv.includes(flag) ? argv[argv.indexOf(flag) + 1] : undefined);
  const iid = argv[1] === 'note' ? argv[3] : argv[2];
  const body = { iid, repo: at('-R'), message: at('-m'), label: at('--label'), unlabel: at('--unlabel'), sha: at('--sha'), auto_merge: argv.includes('--auto-merge') || undefined };
  fs.appendFileSync(process.env.FAKE_GLAB_WRITES ?? '', `${JSON.stringify({ method: 'GLAB', path: `mr ${sub}`, body })}\n`);
  process.exit(0);
}
if (argv[0] !== 'api') fail();
if (method !== 'GET') {
  const route = routes[`${method} ${base}`];
  if (!route) fail();
  httpError(route);
  const raw = argv.includes('--input') ? fs.readFileSync(0, 'utf8') : '';
  const body = raw ? JSON.parse(raw) : null;
  // GitLab's check on a commit's update actions (commits API, actions[].last_commit_id): when the route names each file's
  // `current` last commit, an action naming another one is refused, as GitLab refuses it, and nothing is written.
  const stale = (body?.actions ?? []).find((a) => route.current && a.last_commit_id !== undefined && a.last_commit_id !== route.current[a.file_path]);
  if (stale) {
    const message = '400 You are attempting to update a file that has changed since you started editing it.';
    process.stdout.write(JSON.stringify({ message }));
    console.error(`glab: ${message} (HTTP 400)`);
    process.exit(1);
  }
  fs.appendFileSync(process.env.FAKE_GLAB_WRITES ?? '', `${JSON.stringify({ method, path: base, body })}\n`);
  process.stdout.write(JSON.stringify(route.reply ?? null));
  process.exit(0);
}
if (process.env.FAKE_GLAB_READS) fs.appendFileSync(process.env.FAKE_GLAB_READS, `${target}\n`);
if (!(base in routes)) fail();
httpError(routes[base]);
if (routes[base] && typeof routes[base] === 'object' && typeof routes[base].__raw === 'string') {
  process.stdout.write(routes[base].__raw);
  process.exit(0);
}
const page = Number(new URLSearchParams(query).get('page') ?? '1');
const pages = routes[base] && typeof routes[base] === 'object' && Array.isArray(routes[base].__pages) ? routes[base].__pages : null;
process.stdout.write(JSON.stringify(pages ? (pages[page - 1] ?? []) : page > 1 ? [] : routes[base]));
