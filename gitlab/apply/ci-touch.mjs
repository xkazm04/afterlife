// Does a merge request change its own CI configuration? Such an MR chose which jobs made its evidence, so belay-apply never
// approves or merges it and never gives it proof::pass: it waits for a person. CI configuration is:
//   - the project's CI file (ci_config_path, default .gitlab-ci.yml) when it lives in the project itself;
//   - everything under .gitlab/;
//   - every file the CI file includes locally (include:local, a plain string, or include:project naming this project),
//     followed through the included files, as the head commit has them. [S] docs.gitlab.com/ci/yaml/includes/
// Fails closed: a CI file that does not parse, an include that cannot be read (anything but a 404), more includes than
// the cap, and an include this file cannot resolve from the head's files alone (a path or project with a variable, or a
// wildcard, whose matches are not followed, F68) all count as "touches", with the reason.
import { parse } from 'yaml';

const MAX_FILES = 100;

/**
 * The local paths one CI file includes, or `{unresolved}` naming the first include that cannot be followed. A remote,
 * template or component include is not this project's file. An include:project whose project carries a variable may be
 * this project, so it is unresolved too.
 */
function localIncludes(doc, projectPath) {
  const inc = doc && typeof doc === 'object' ? doc.include : undefined;
  if (inc === undefined || inc === null) return { paths: [] };
  const out = [];
  for (const i of [].concat(inc)) {
    if (typeof i === 'string') {
      if (!/^https?:\/\//.test(i)) out.push(i);
    } else if (i && typeof i === 'object') {
      if (typeof i.local === 'string') out.push(i.local);
      else if (typeof i.project === 'string' && i.project.includes('$')) return { unresolved: `its CI configuration includes from the project ${i.project}, a variable` };
      else if (i.project === projectPath) out.push(...[].concat(i.file ?? []).filter((f) => typeof f === 'string'));
    }
  }
  const paths = out.map((p) => p.replace(/^\/+/, ''));
  const variable = paths.find((p) => p.includes('$'));
  if (variable) return { unresolved: `its CI configuration includes ${variable}, a path with a variable` };
  const wildcard = paths.find((p) => p.includes('*'));
  if (wildcard) return { unresolved: `its CI configuration includes ${wildcard}, a wildcard whose files are not followed` };
  return { paths };
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
    const includes = localIncludes(doc, project.path_with_namespace);
    if (includes.unresolved) return `${includes.unresolved}: treated as changed`;
    for (const inc of includes.paths) {
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
