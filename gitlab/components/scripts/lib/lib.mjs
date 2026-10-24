// Shared helpers for the Belay CI glue. Node 20+, no dependencies. These run inside the
// components' jobs (see ../templates). Nothing here ever prints a token.
// The helpers live in core/ (glab.mjs: glab and its retry rule; api.mjs: REST, paging, GraphQL, trusted notes; text.mjs:
// fenced blocks, trailers, id shapes); this file keeps the CLI basics and re-exports the rest, so every importer reads lib.mjs.
export { ATTEMPTS, glab, HOST, httpStatus, setSleep, transient } from './core/glab.mjs';
export { api, apiAll, gql, pageAll, trustedNotes } from './core/api.mjs';
export { blocks, CLASS_ID, fence, plain, trailer, ULID, withoutBlocks } from './core/text.mjs';

export function die(msg, code = 2) {
  console.error(`belay: ${msg}`);
  process.exit(code);
}

export function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

export function need(name) {
  const v = arg(name);
  if (!v) die(`missing --${name}`);
  return v;
}

export const enc = encodeURIComponent;
