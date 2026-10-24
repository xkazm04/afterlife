import { describe, expect, it } from 'vitest';
import { copyReport } from './copyReport';

const settle = () => new Promise((r) => setTimeout(r, 0));
const HAND = 'Copy failed: select the report and copy it by hand';

describe('copying a cycle report', () => {
  it('says it copied when the clipboard took the Markdown', async () => {
    const said: string[] = [];
    let took = '';
    copyReport('C6', '# C6', { writeText: async (t) => void (took = t) }, (t) => said.push(t));
    await settle();
    expect([took, said]).toEqual(['# C6', ['C6 report copied as Markdown']]);
  });
  it('names the hand copy when the clipboard refuses, without echoing the report', async () => {
    const said: string[] = [];
    copyReport('C6', '# C6', { writeText: () => Promise.reject(new Error('denied')) }, (t) => said.push(t));
    await settle();
    expect(said).toEqual([HAND]);
  });
  it('names the hand copy when there is no clipboard (insecure origin), instead of staying silent', async () => {
    const said: string[] = [];
    copyReport('C6', '# C6', undefined, (t) => said.push(t));
    await settle();
    expect(said).toEqual([HAND]);
  });
});
