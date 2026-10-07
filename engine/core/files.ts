// File IO for the commands. Pure logic never touches the disk; only these helpers do.
import fs from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { EngineError, isRecord, type Ctx } from './types';

export function readText(ctx: Ctx, file: string): string {
  const p = path.resolve(ctx.cwd, file);
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    throw new EngineError(`cannot read ${file}`);
  }
}

export function parseJson(text: string, what: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch (e) {
    throw new EngineError(`${what} is not valid JSON: ${(e as Error).message}`);
  }
}

export function readJson(ctx: Ctx, file: string): unknown {
  return parseJson(readText(ctx, file), file);
}

export function readYaml(ctx: Ctx, file: string): unknown {
  try {
    return parseYaml(readText(ctx, file)) as unknown;
  } catch (e) {
    if (e instanceof EngineError) throw e;
    throw new EngineError(`${file} is not valid YAML: ${(e as Error).message}`);
  }
}

function realPath(p: string): string {
  try {
    return fs.realpathSync(p);
  } catch {
    throw new EngineError(`cannot read ${p}`);
  }
}

/** The real path of `file` (symlinks resolved), if it sits under `root` and in no `.git` folder. */
function contained(file: string, root: string): string {
  const real = realPath(file);
  const rel = path.relative(realPath(root), real);
  if (rel === '' || rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) throw new EngineError(`$file ${file} is outside ${root}`);
  if (rel.split(path.sep).some((s) => s.toLowerCase() === '.git')) throw new EngineError(`$file ${file} is inside a .git folder`);
  return real;
}

/**
 * Evidence is often a big text file (a trace, a diff, JUnit XML). A prove input may point at it with
 * `{"$file": "relative/path"}`, resolved against the input file's own folder and replaced by its text. The text ends
 * up in a Proof Block posted on the merge request, so the file must sit under `root` (the input's folder unless
 * `prove --files-root` names the job's folder) and never in a `.git` folder, where a clone URL can hold a token.
 */
export function inlineFiles(ctx: Ctx, value: unknown, baseDir: string, root: string = baseDir): unknown {
  if (Array.isArray(value)) return value.map((v) => inlineFiles(ctx, v, baseDir, root));
  if (!isRecord(value)) return value;
  if (typeof value.$file === 'string' && Object.keys(value).length === 1) {
    return readText(ctx, contained(path.resolve(baseDir, value.$file), root));
  }
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, inlineFiles(ctx, v, baseDir, root)]));
}

/** A prove input, with its `$file` references inlined. Other commands read plain JSON with readJson. */
export function readInput(ctx: Ctx, file: string, root?: string): unknown {
  const dir = path.dirname(path.resolve(ctx.cwd, file));
  return inlineFiles(ctx, readJson(ctx, file), dir, root === undefined ? dir : path.resolve(ctx.cwd, root));
}
