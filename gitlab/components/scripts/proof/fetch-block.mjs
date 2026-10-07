// Finds the newest fenced block `--tag` written by one of `--authors` and writes it to `--out`.
// Sources: the MR's notes (default) or, with `--from description`, the MR description. Text written by anyone
// else is ignored: it is untrusted data unless a known account wrote it.
// `--head-sha S` keeps only blocks made for head S: `head_sha` in a verdict, `task.head_sha` in a Proof Block (a block for an
// older push is stale).
// `--schema f.json` checks the block (lib/validate.mjs); custom flows cannot set response_schema_id, so CI checks.
// `--gate-out f` also writes {verdict, severity} for `engine gate --guardrail` (severity = the highest finding).
// Exit 0 = written, 3 = no trusted block, 4 = the block fails its schema.
import fs from 'node:fs';
import { api, arg, blocks, die, need, trustedNotes } from '../lib/lib.mjs';
import { validate } from '../lib/validate.mjs';

const projectId = process.env.CI_PROJECT_ID ?? die('CI_PROJECT_ID is not set');
const tag = need('tag');
const out = need('out');
const mr = need('mr');
const authors = need('authors');
const schemaFile = arg('schema');
const headSha = arg('head-sha');

let sources;
if (arg('from') === 'description') {
  const m = api(`projects/${projectId}/merge_requests/${mr}`);
  const allowed = authors.split(',').map((s) => s.trim());
  sources = allowed.includes(m.author?.username) ? [{ id: 'description', body: m.description, author: m.author }] : [];
} else {
  sources = trustedNotes(projectId, mr, authors);
}

const RANK = { low: 1, medium: 2, high: 3 };
for (const src of sources) {
  const found = blocks(src.body, tag).at(-1);
  if (found === undefined) continue;
  const madeFor = found.head_sha ?? found.task?.head_sha;
  if (headSha && madeFor !== headSha) {
    console.error(`belay: ${tag} block in ${src.id} is for ${String(madeFor).slice(0, 8)}, not ${headSha.slice(0, 8)}: stale`);
    continue;
  }
  if (schemaFile) {
    const problems = validate(found, JSON.parse(fs.readFileSync(schemaFile, 'utf8')));
    if (problems.length) {
      console.error(`belay: ${tag} block in ${src.id} fails ${schemaFile}:\n  ${problems.slice(0, 10).join('\n  ')}`);
      process.exit(4);
    }
  }
  fs.writeFileSync(out, JSON.stringify(found, null, 2));
  if (arg('gate-out')) {
    const top = (found.findings ?? []).reduce((a, f) => ((RANK[f.severity] ?? 0) > (RANK[a] ?? 0) ? f.severity : a), undefined);
    fs.writeFileSync(arg('gate-out'), JSON.stringify({ verdict: found.verdict, ...(top ? { severity: top } : {}) }));
  }
  console.log(JSON.stringify({ source: src.id, author: src.author?.username }));
  process.exit(0);
}
console.error(`belay: no trusted ${tag} block on this MR`);
process.exit(3);
