// Facts from a checkout: files only. Reads the CI config (local includes followed), CODEOWNERS, .gitlab/, IaC and
// alerting files. What only GitLab knows (pipelines, protections, approvals) is recorded as not read, never as none.
import fs from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { readCi } from './ci';
import { known, unread, type CiConfig, type Fact, type ScanFacts } from './facts';

const SKIP = new Set(['.git', 'node_modules', '.belay', '.belay-engine', '.belay-policy', 'vendor', 'dist', 'build', '.next']);
const WANT = /^(\.gitlab\/.+|(docs\/)?CODEOWNERS|.+\.tf|(.+\/)?prometheus[^/]*\.ya?ml|alerts?\/.+\.ya?ml)$/;
const CONTENT = /alerting|prometheus|^alerts?\//;
const MAX_FILES = 20_000;
const NOT_READ = 'a checkout scan reads files only';

function walk(root: string): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  let seen = 0;
  const visit = (dir: string, depth: number): void => {
    if (depth > 8 || seen > MAX_FILES) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      seen++;
      const abs = path.join(dir, e.name);
      const rel = path.relative(root, abs).split(path.sep).join('/');
      if (e.isDirectory()) {
        if (!SKIP.has(e.name)) visit(abs, depth + 1);
      } else if (e.isFile() && WANT.test(rel)) out[rel] = CONTENT.test(rel) ? fs.readFileSync(abs, 'utf8') : null;
    }
  };
  visit(root, 0);
  return out;
}

const yaml = (text: string): unknown => parseYaml(text, { logLevel: 'error', customTags: [{ tag: '!reference', collection: 'seq', resolve: (v) => v }] }) as unknown;

function ci(root: string): Fact<CiConfig> {
  const file = path.join(root, '.gitlab-ci.yml');
  if (!fs.existsSync(file)) return known({ origin: '.gitlab-ci.yml', jobs: [], includes: [], unresolved: [] });
  try {
    const open = (rel: string): unknown => {
      const abs = path.resolve(root, rel);
      return abs.startsWith(root) && fs.existsSync(abs) ? yaml(fs.readFileSync(abs, 'utf8')) : undefined;
    };
    return known(readCi(yaml(fs.readFileSync(file, 'utf8')), '.gitlab-ci.yml', open));
  } catch (e) {
    return unread(`.gitlab-ci.yml is not valid YAML: ${(e as Error).message.split('\n')[0]}`);
  }
}

/** The facts a checkout gives. `root` must be a directory; the caller checks it. */
export function checkoutFacts(root: string): ScanFacts {
  return {
    source: 'checkout',
    project: path.basename(root),
    files: known(walk(root)),
    ci: ci(root),
    pipeline: unread(NOT_READ),
    protection: unread(NOT_READ),
    approvals: unread(NOT_READ),
  };
}
