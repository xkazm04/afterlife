import { describe, expect, it } from 'vitest';
import { saveNote } from './saveNote';

describe('saveNote', () => {
  it('says saved when the browser kept the size', () => {
    expect(saveNote(true, 'Standard')).toBe('Saved in this browser. Standard is the default.');
  });
  it('says it was not saved when the browser refused', () => {
    expect(saveNote(false, 'Standard')).toMatch(/^Not saved:.*this visit only/);
  });
});
