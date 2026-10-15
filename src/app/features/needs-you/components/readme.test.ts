// The README's map of the screen must name every folder under components/, derived from the folders and not from a list.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const here = new URL('./', import.meta.url);
const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const folders = readdirSync(here, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

describe('the Needs you README', () => {
  it('finds the component folders it is checking', () => {
    expect(folders).toContain('band');
    expect(folders.length).toBeGreaterThanOrEqual(8);
  });

  it.each(folders)('names components/%s/', (dir) => {
    expect(readme).toContain(`components/${dir}/`);
  });
});
