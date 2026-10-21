// Prompt drift: runner/prompts/* are vendored from ascent at the sha pinned in runner/prompts/sources.json.
// This recomputes the sha256 of each source file in an ascent checkout and reports any that changed since.
// Sources marked `"ref": "archive"` are blobs on sources.json `archive.ref` (Ascent's never-merged experiment branch).
// Exit 0 clean, 1 drift (prints each changed source and ascent's commits since the pinned sha), 2 checkout missing.
// Hashes are over LF-normalised text so a Windows autocrlf checkout hashes like a Linux one.
// Usage: node scripts/prompt-drift.mjs [--ascent <path>] [--sources <sources.json>]
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
};
const ascent = path.resolve(flag('--ascent', path.join(root, '..', 'ascent')));
const sourcesFile = path.resolve(flag('--sources', path.join(root, 'runner/prompts/sources.json')));

const sha256 = (text) => crypto.createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex');

if (!fs.existsSync(ascent) || !fs.statSync(ascent).isDirectory()) {
  console.error(`prompt-drift: no ascent checkout at ${ascent}`);
  console.error('Point at one with: node scripts/prompt-drift.mjs --ascent <path-to-ascent>  (default: ../ascent beside this repo)');
  process.exit(2);
}

const manifest = JSON.parse(fs.readFileSync(sourcesFile, 'utf8'));
const gitOut = (...a) => spawnSync('git', ['-C', ascent, ...a], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
let drifted = 0;
let unchecked = 0;
for (const entry of manifest.sources) {
  for (const src of entry.from) {
    // `ref: "archive"`: the source is a blob on manifest.archive.ref (an experiment branch never merged to master),
    // compared as committed there, not against the working tree.
    const archived = src.ref === 'archive';
    let now = null;
    if (archived) {
      const blob = gitOut('show', `${manifest.archive.ref}:${src.path}`);
      if (blob.status !== 0) {
        unchecked += 1;
        console.log(`UNCHECKED ${entry.file} <- ${manifest.archive.ref}:${src.path} (the archive ref is not in this checkout; fetch it to check)`);
        continue;
      }
      now = sha256(blob.stdout);
    } else {
      const file = path.join(ascent, src.path);
      now = fs.existsSync(file) ? sha256(fs.readFileSync(file, 'utf8')) : null;
    }
    if (now === src.sha256) continue;
    drifted += 1;
    console.log(`DRIFT ${entry.file} <- ${archived ? `${manifest.archive.ref}:` : ''}${src.path} (${now ? 'changed' : 'missing in checkout'})`);
    const since = archived ? `${src.commit}..${manifest.archive.ref}` : `${manifest.ascent}..HEAD`;
    const out = (gitOut('log', '--oneline', since, '--', src.path).stdout ?? '').trim();
    console.log(out ? out.replace(/^/gm, '  ') : `  (no git history in ${since}; the file differs from the vendored copy)`);
  }
}
if (unchecked) console.log(`${unchecked} archived source(s) not checked: the archive ref is missing.`);
if (drifted) {
  console.log(`${drifted} source(s) drifted. Re-port the affected runner/prompts file, then update sources.json.`);
  process.exit(1);
}
console.log(`prompt-drift: clean against ascent@${manifest.ascent.slice(0, 8)}`);
