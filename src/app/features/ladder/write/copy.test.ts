import { describe, expect, it } from 'vitest';
import { copyCommand } from './copy';

const settle = () => new Promise((r) => setTimeout(r, 0));

describe('copyCommand', () => {
  it('says it copied when the clipboard took the text', async () => {
    const said: string[] = [];
    copyCommand('the write', { writeText: async () => {} }, (t) => said.push(t), 'Copied');
    await settle();
    expect(said).toEqual(['Copied']);
  });
  it('shows the command when the clipboard refuses it', async () => {
    const said: string[] = [];
    copyCommand('the write', { writeText: () => Promise.reject(new Error('denied')) }, (t) => said.push(t), 'Copied');
    await settle();
    expect(said).toEqual(['the write']);
  });
  it('shows the command when there is no clipboard (insecure origin), instead of staying silent', () => {
    const said: string[] = [];
    copyCommand('the write', undefined, (t) => said.push(t), 'Copied');
    expect(said).toEqual(['the write']);
  });
});
