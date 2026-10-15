// The dev inspector loader: stamps host JSX (lower-case tags) of src/**/*.tsx with data-loc="path:line:col", nothing else.
import { describe, expect, it } from 'vitest';
import loader from './source-loc-loader.mjs';

const run = (resourcePath, source) => loader.call({ resourcePath }, source);
const SRC = 'export const A = () => <div className="x"><Card /><span>t</span></div>;\n';

describe('source-loc-loader', () => {
  it('stamps host elements with their file, line and column, and leaves components alone', () => {
    const out = run('C:\\repo\\src\\app\\A.tsx', SRC);
    expect(out).toContain('<div data-loc="src/app/A.tsx:1:24" className="x">');
    expect(out).toContain('<span data-loc="src/app/A.tsx:1:51">t</span>');
    expect(out).toContain('<Card />');
  });

  it('does not stamp twice', () => {
    const once = run('/r/src/A.tsx', SRC);
    expect(run('/r/src/A.tsx', once)).toBe(once);
  });

  it('returns the source untouched outside src/, under src/lib/dev, and for non-tsx files', () => {
    expect(run('/r/other/A.tsx', SRC)).toBe(SRC);
    expect(run('/r/src/lib/dev/A.tsx', SRC)).toBe(SRC);
    expect(run('/r/src/A.ts', SRC)).toBe(SRC);
  });
});
