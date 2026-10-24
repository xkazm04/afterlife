// npm run smoke visits the pages the app tree holds; a hand list missed /runs and three /settings sub-pages.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { smokeRoutes, staticRoutes } from './routes.mjs';

const app = fileURLToPath(new URL('../../src/app', import.meta.url));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'smoke-routes-'));
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

const page = (rel) => {
  fs.mkdirSync(path.join(tmp, rel), { recursive: true });
  fs.writeFileSync(path.join(tmp, rel, 'page.tsx'), '');
};

describe('staticRoutes', () => {
  it('drops route groups from the path and skips dynamic, private and api folders', () => {
    for (const rel of ['(door)', 'a', 'a/b', 'a/[id]', 'a/[id]/c', '_draft', 'api/x', 'features/x/api']) page(rel);
    fs.writeFileSync(path.join(tmp, 'a', 'layout.tsx'), '');
    expect(staticRoutes(tmp)).toEqual(['/', '/a', '/a/b', '/features/x/api']);
  });
});

describe('smokeRoutes over src/app', () => {
  const routes = smokeRoutes(app);

  it('holds every static screen, including the ones the hand list missed', () => {
    for (const r of ['/fleet', '/runs', '/settings', '/settings/about', '/settings/data', '/settings/keyboard', '/theater']) expect(routes).toContain(r);
  });

  it('leaves the door and the dev gallery out, and visits the estate view after /cycles', () => {
    expect(routes).not.toContain('/');
    expect(routes).not.toContain('/kit');
    expect(routes.indexOf('/cycles?scope=estate')).toBe(routes.indexOf('/cycles') + 1);
    expect(routes.every((r) => !r.includes('['))).toBe(true);
  });
});
