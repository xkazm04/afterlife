// Does a merge request change its own CI configuration? Such an MR chose which jobs made its evidence, so belay-apply never
// approves or merges it and never gives it proof::pass: it waits for a person. CI configuration is:
//   - the project's CI file (ci_config_path, default .gitlab-ci.yml) when it lives in the project itself;
//   - everything under .gitlab/;
//   - every file the CI file includes locally (include:local, a plain string, or include:project naming this project),
//     followed through the included files, as the head commit has them. [S] docs.gitlab.com/ci/yaml/includes/
// Fails closed: a CI file that does not parse, an include that cannot be read (anything but a 404), or more includes than
// the cap all count as "touches", with the reason.
import { parse } from 'yaml';

const MAX_FILES = 100;

/** A glob of an include (`*` within a segment, `**` across them) as a RegExp over repository paths. */
function globRe(pattern) {
  const src = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*\/?/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*');
  return new RegExp(`^${src}$`);
}

/** The local paths one CI file includes. A remote, template or component include is not this project's file. */
function localIncludes(doc, projectPath) {
  const inc = doc && typeof doc === 'object' ? doc.include : undefined;
  if (inc === undefined || inc === null) return [];
  const out = [];
  for (const i of [].concat(inc)) {
    if (typeof i === 'string') {
      if (!/^https?:\/\//.test(i)) out.push(i);
    } else if (i && typeof i === 'object') {
      if (typeof i.local === 'string') out.push(i.local);
      else if (i.project === projectPath) out.push(...[].concat(i.file ?? []).filter((f) => typeof f === 'string'));
    }
  }
  return out.map((p) => p.replace(/^\/+/, ''));
}

/**
 * `changed`: every old and new path of the diff. `project`: {path_with_namespace, ci_config_path}. `readAt(path)`: the file
 * at the MR's head, or null on 404 (it throws on any other failure). Returns null, or the reason the MR touches CI.
 */
export function touchesCi({ changed, project, readAt }) {
  const paths = new Set(changed.filter(Boolean));
  const own = project.ci_config_path || '.gitlab-ci.yml';
  const external = own.includes('@') || /^https?:\/\//.test(own);
  const hit = (p) => paths.has(p);

  for (const p of paths) if (p === '.gitlab' || p.startsWith('.gitlab/')) return `it changes ${p}`;
  if (!external && hit(own)) return `it changes the CI file ${own}`;
  if (external) return null; // the CI file lives outside the project: this MR cannot change it, nor what it includes [R?]

  const seen = new Set([own]);
  const queue = [own];
  while (queue.length) {
    const file = queue.shift();
    let text;
    try {
      text = readAt(file);
    } catch (e) {
      return `its CI file ${file} could not be read (${String(e.message ?? e).split('\n')[0]}): treated as changed`;
    }
    if (text === null) continue;
    let doc;
    try {
      doc = parse(text);
    } catch {
      return `its CI file ${file} does not parse: treated as changed`;
    }
    for (const inc of localIncludes(doc, project.path_with_namespace)) {
      if (inc.includes('*')) {
        const re = globRe(inc);
        const p = [...paths].find((x) => re.test(x));
        if (p) return `it changes ${p}, which the CI configuration includes (${inc})`;
        continue; // [R?] files matched by a wildcard include are not followed further
      }
      if (hit(inc)) return `it changes ${inc}, which the CI configuration includes`;
      if (!seen.has(inc)) {
        if (seen.size >= MAX_FILES) return `its CI configuration includes more than ${MAX_FILES} files: treated as changed`;
        seen.add(inc);
        queue.push(inc);
      }
    }
  }
  return null;
}
