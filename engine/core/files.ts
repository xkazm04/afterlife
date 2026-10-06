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

/**
 * Evidence is often a big text file (a trace, a diff, JUnit XML). A JSON input may point at it with
 * `{"$file": "relative/path"}`, resolved against the input file's own folder and replaced by its text.
 */
export function inlineFiles(ctx: Ctx, value: unknown, baseDir: string): unknown {
  if (Array.isArray(value)) return value.map((v) => inlineFiles(ctx, v, baseDir));
  if (!isRecord(value)) return value;
  if (typeof value.$file === 'string' && Object.keys(value).length === 1) {
    return readText(ctx, path.resolve(baseDir, value.$file));
  }
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, inlineFiles(ctx, v, baseDir)]));
}

export function readInput(ctx: Ctx, file: string): unknown {
  const abs = path.resolve(ctx.cwd, file);
  return inlineFiles(ctx, readJson(ctx, file), path.dirname(abs));
}
