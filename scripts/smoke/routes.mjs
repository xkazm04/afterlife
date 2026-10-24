// The routes npm run smoke visits, read from the app tree rather than kept by hand: every page.tsx under src/app whose
// path has no dynamic segment. A route group `(name)` adds no segment; `_private` folders and api/ are not pages.
import fs from 'node:fs';
import path from 'node:path';

/** Sorted URL paths of the static pages under `appDir` (src/app), '/' included. */
export function staticRoutes(appDir) {
  const out = [];
  const walk = (dir, segs) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isFile() && e.name === 'page.tsx') out.push('/' + segs.join('/'));
      if (!e.isDirectory() || e.name.startsWith('_') || e.name.includes('[') || (segs.length === 0 && e.name === 'api')) continue;
      walk(path.join(dir, e.name), /^\(.+\)$/.test(e.name) ? segs : [...segs, e.name]);
    }
  };
  walk(appDir, []);
  return out.sort();
}

// The door ('/') is visited apart (smoke.mjs DOOR, no layout probe); /kit is the dev gallery, not linked from the
// navigation. A query view that is a screen of its own is added by name.
const APART = ['/', '/kit'];
const VIEWS = ['/cycles?scope=estate'];

/** What npm run smoke probes: the static pages minus APART, each VIEW after its page. */
export function smokeRoutes(appDir) {
  return staticRoutes(appDir).filter((r) => !APART.includes(r)).flatMap((r) => [r, ...VIEWS.filter((v) => v.startsWith(`${r}?`))]);
}
