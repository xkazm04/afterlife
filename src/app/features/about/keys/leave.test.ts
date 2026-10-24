import { describe, expect, it } from 'vitest';
import { leaveHref, leaveWords } from './leave';

describe('leaveHref', () => {
  it('goes back to the door when the viewer came from it', () => {
    expect(leaveHref('door')).toBe('/');
  });

  it('enters the app from anywhere else', () => {
    expect(leaveHref(null)).toBe('/fleet');
    expect(leaveHref('')).toBe('/fleet');
    expect(leaveHref('fleet')).toBe('/fleet');
    expect(leaveHref('Door')).toBe('/fleet');
  });

  it('names where Esc leads in the key hint', () => {
    expect(leaveWords('/')).toBe('Esc back to the door');
    expect(leaveWords('/fleet')).toBe('Esc enters Afterlife');
  });
});
