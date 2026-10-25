// Facts from a checkout: files only. Reads the CI config (GitLab with local includes followed, Azure Pipelines with their
// templates, GitHub Actions), CODEOWNERS, .gitlab/, IaC and alerting files. What only the CI server knows (pipelines,
// protections, approvals) is not a fact here: the rules say so.
import fs from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { readCi } from './ci';
import { known, unread, type CiConfig, type Fact, type ScanFacts } from './facts';
import { readPipelines } from './pipelines/read';
import { LIMITS, listFiles, type WalkLimits } from './walk';

export type { WalkLimits } from './walk';

const yaml = (text: string): unknown => parseYaml(text, { logLevel: 'error', customTags: [{ tag: '!reference', collection: 'seq', resolve: (v) => v }] }) as unknown;

/** A checkout file's parsed YAML, or undefined when the path is not a file inside the checkout. Throws when it does not parse. */
const opener = (root: string) => (rel: string): unknown => {
  const abs = path.resolve(root, rel);
  // inside the checkout by path, not by prefix: /x/repo-evil starts with /x/repo
  const up = path.relative(root, abs);
  const inside = up !== '' && up !== '..' && !up.startsWith(`..${path.sep}`) && !path.isAbsolute(up);
  // a folder is no include file: unresolved, not a read error that would void the whole CI config
  return inside && fs.statSync(abs, { throwIfNoEntry: false })?.isFile() ? yaml(fs.readFileSync(abs, 'utf8')) : undefined;
};

function gitlab(root: string): Fact<CiConfig> {
  const file = path.join(root, '.gitlab-ci.yml');
  if (!fs.existsSync(file)) return known({ origin: '.gitlab-ci.yml', jobs: [], includes: [], unresolved: [] });
  try {
    return known(readCi(yaml(fs.readFileSync(file, 'utf8')), '.gitlab-ci.yml', opener(root)));
  } catch (e) {
    return unread(`.gitlab-ci.yml is not valid YAML: ${(e as Error).message.split('\n')[0]}`);
  }
}

/** The GitLab config with the Azure Pipelines and GitHub Actions jobs merged in, each job naming its file. */
function ci(root: string, paths: readonly string[]): Fact<CiConfig> {
  const gl = gitlab(root);
  if (!gl.ok) return gl;
  const other = readPipelines(paths, opener(root));
  return known({ ...gl.value, jobs: [...gl.value.jobs, ...other.jobs], unresolved: [...gl.value.unresolved, ...other.unresolved] });
}

/** The facts a checkout gives. `root` must be a directory; the caller checks it. */
export function checkoutFacts(root: string, limits: WalkLimits = LIMITS): ScanFacts {
  const w = listFiles(root, limits);
  return {
    source: 'checkout',
    project: path.basename(root),
    files: known(w.files),
    filesGap: w.gap,
    ci: ci(root, Object.keys(w.files)),
  };
}
