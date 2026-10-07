import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// F24: `next dev` and `next start` listen on 0.0.0.0 unless given -H, and F17's Host check only holds on loopback.
const scripts = (JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as { scripts: Record<string, string> })
  .scripts;

describe('the scripts that start the server', () => {
  it.each(['dev', 'start'])('%s binds 127.0.0.1 only', (name) => {
    expect(scripts[name]).toMatch(/^next (dev|start)\b.*(?:-H|--hostname)[ =]127\.0\.0\.1(?:\s|$)/);
  });
});
