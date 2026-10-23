// Path globs for deny_paths and environments. `*` stays inside one path segment, `**` crosses folders,
// `?` is one character. A pattern with no slash matches the file name at any depth (like .gitignore),
// so `CODEOWNERS` also protects `.gitlab/CODEOWNERS`. A leading `/` anchors to the repository root (`/CODEOWNERS` is the
// root file only) and a trailing `/` is the whole folder (`secrets/` is `secrets/**`), as .gitignore reads them.

function escapeChar(c: string): string {
  return /[.+^${}()|[\]\\]/.test(c) ? `\\${c}` : c;
}

export function globToRegExp(pattern: string): RegExp {
  let re = '';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i] ?? '';
    if (c === '*' && pattern[i + 1] === '*') {
      i++;
      if (pattern[i + 1] === '/') {
        i++;
        re += '(?:.*/)?';
      } else re += '.*';
    } else if (c === '*') re += '[^/]*';
    else if (c === '?') re += '[^/]';
    else re += escapeChar(c);
  }
  // dotAll: `.*` from `**` must cross a line break too, or a file named ".gitlab/a<LF>b.yml" (git quotes it, parseDiff
  // decodes it) slips past a `.gitlab/**` deny rule.
  return new RegExp(`^${re}$`, 's');
}

export function matchesPath(pattern: string, file: string): boolean {
  const f = file.replace(/^\.\//, '');
  let p = pattern.replace(/^\.\//, '');
  // a diff path has neither a leading nor a trailing slash: read literally, `/x` and `dir/` would match nothing at all
  const anchored = p.startsWith('/');
  if (anchored) p = p.replace(/^\/+/, '');
  if (p.endsWith('/')) p += '**';
  if (!anchored && !p.includes('/')) return globToRegExp(p).test(f.split('/').at(-1) ?? f);
  return globToRegExp(p).test(f);
}

/** Environment names (`review/mr-41`, `staging`, `production`) use the same glob rules, whole-string. */
export function matchesEnvironment(pattern: string, env: string): boolean {
  return globToRegExp(pattern).test(env);
}
