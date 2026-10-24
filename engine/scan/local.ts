// Facts from a checkout: files only. Reads the CI config (local includes followed), CODEOWNERS, .gitlab/, IaC and
// alerting files. What only GitLab knows (pipelines, protections, approvals) is not a fact here: the rules say so.
import fs from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { readCi } from './ci';
import { known, unread, type CiConfig, type Fact, type ScanFacts } from './facts';

const SKIP = new Set(['.git', 'node_modules', '.belay', '.belay-engine', '.belay-policy', 'vendor', 'dist', 'build', '.next']);
const WANT = /^(\.gitlab\/.+|(docs\/)?CODEOWNERS|.+\.tf|(.+\/)?prometheus[^/]*\.ya?ml|alerts?\/.+\.ya?ml)$/;
const CONTENT = /alerting|prometheus|^alerts?\//;
const MAX_FILES = 20_000;

/** How far the walk goes. A checkout past either limit is read in part, and the scan says so. */
export interface WalkLimits {
  files: number;
  depth: number;
}
const LIMITS: WalkLimits = { files: MAX_FILES, depth: 8 };

/** The wanted files, and why the walk did not see all of them (null: it saw every entry). */
function walk(root: string, limits: WalkLimits): { files: Record<string, string | null>; gap: string | null } {
  const files: Record<string, string | null> = {};
  const unreadable: string[] = [];
  let seen = 0;
  let cut = false;
  const visit = (dir: string, depth: number): void => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      unreadable.push(path.relative(root, dir).split(path.sep).join('/') || '.');
      return;
    }
    for (const e of entries) {
      if (seen >= limits.files) {
        cut = true;
        return;
      }
      seen++;
      const abs = path.join(dir, e.name);
      const rel = path.relative(root, abs).split(path.sep).join('/');
      if (e.isDirectory()) {
        if (SKIP.has(e.name)) continue;
        if (depth >= limits.depth) cut = true;
        else visit(abs, depth + 1);
      } else if (e.isFile() && WANT.test(rel)) {
        try {
          files[rel] = CONTENT.test(rel) ? fs.readFileSync(abs, 'utf8') : null;
        } catch {
          unreadable.push(rel);
        }
      }
    }
  };
  visit(root, 0);
  const why = [
    cut ? `the walk stopped at ${limits.files} entries or ${limits.depth} levels deep` : '',
    unreadable.length ? `${unreadable.length} path(s) could not be read (${unreadable.slice(0, 3).join(', ')}${unreadable.length > 3 ? ', ...' : ''})` : '',
  ].filter(Boolean);
  return { files, gap: why.length ? `part of the checkout was not read: ${why.join('; ')}` : null };
}

const yaml = (text: string): unknown => parseYaml(text, { logLevel: 'error', customTags: [{ tag: '!reference', collection: 'seq', resolve: (v) => v }] }) as unknown;

function ci(root: string): Fact<CiConfig> {
  const file = path.join(root, '.gitlab-ci.yml');
  if (!fs.existsSync(file)) return known({ origin: '.gitlab-ci.yml', jobs: [], includes: [], unresolved: [] });
  try {
    const open = (rel: string): unknown => {
      const abs = path.resolve(root, rel);
      // inside the checkout by path, not by prefix: /x/repo-evil starts with /x/repo
      const up = path.relative(root, abs);
      const inside = up !== '' && up !== '..' && !up.startsWith(`..${path.sep}`) && !path.isAbsolute(up);
      // a folder is no include file: unresolved, not a read error that would void the whole CI config
      return inside && fs.statSync(abs, { throwIfNoEntry: false })?.isFile() ? yaml(fs.readFileSync(abs, 'utf8')) : undefined;
    };
    return known(readCi(yaml(fs.readFileSync(file, 'utf8')), '.gitlab-ci.yml', open));
  } catch (e) {
    return unread(`.gitlab-ci.yml is not valid YAML: ${(e as Error).message.split('\n')[0]}`);
  }
}

/** The facts a checkout gives. `root` must be a directory; the caller checks it. */
export function checkoutFacts(root: string, limits: WalkLimits = LIMITS): ScanFacts {
  const w = walk(root, limits);
  return {
    source: 'checkout',
    project: path.basename(root),
    files: known(w.files),
    filesGap: w.gap,
    ci: ci(root),
  };
}
