import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readConnection } from '../data/connection';
import { ConnectionSection } from './ConnectionSection';

const modeCell = () => renderToStaticMarkup(createElement(ConnectionSection, { read: readConnection(process.env) })).match(/<th scope="row">Mode<\/th><td>([^<]*)<\/td>/)?.[1];

afterEach(() => vi.unstubAllEnvs());

// The Mode row says what AFTERLIFE_MODE did: "the default" only when it is unset, never for a value that fell back to demo.
describe('ConnectionSection, the Mode row', () => {
  it('unset: demo, the default', () => {
    vi.stubEnv('AFTERLIFE_MODE', undefined);
    expect(modeCell()).toBe('demo (the default)');
  });
  it('live: names the variable', () => {
    vi.stubEnv('AFTERLIFE_MODE', 'live');
    vi.stubEnv('AFTERLIFE_GITLAB', 'fake');
    expect(modeCell()).toBe('live (AFTERLIFE_MODE=live)');
  });
  it.each(['replay', 'Live'])('AFTERLIFE_MODE=%s: demo, and says that value is not live', (v) => {
    vi.stubEnv('AFTERLIFE_MODE', v);
    expect(modeCell()).toBe(`demo (AFTERLIFE_MODE=${v} is not live)`);
  });
});

describe('ConnectionSection before the read lands', () => {
  it('draws the same rows with a dash in each value, never a guess', () => {
    const html = renderToStaticMarkup(createElement(ConnectionSection));
    for (const row of ['Mode', 'GitLab', 'Host', 'Group id']) expect(html).toMatch(new RegExp(`<th scope="row">${row}</th><td[^>]*><span[^>]*>—</span>`));
    expect(html).not.toContain('demo (the default)');
  });
});
