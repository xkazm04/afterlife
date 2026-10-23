import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConnectionSection } from './ConnectionSection';

const modeCell = () => renderToStaticMarkup(createElement(ConnectionSection)).match(/<th scope="row">Mode<\/th><td>([^<]*)<\/td>/)?.[1];

afterEach(() => vi.unstubAllEnvs());

// The Mode row says what BELAY_MODE did: "the default" only when it is unset, never for a value that fell back to demo.
describe('ConnectionSection, the Mode row', () => {
  it('unset: demo, the default', () => {
    vi.stubEnv('BELAY_MODE', undefined);
    expect(modeCell()).toBe('demo (the default)');
  });
  it('live: names the variable', () => {
    vi.stubEnv('BELAY_MODE', 'live');
    vi.stubEnv('BELAY_GITLAB', 'fake');
    expect(modeCell()).toBe('live (BELAY_MODE=live)');
  });
  it.each(['replay', 'Live'])('BELAY_MODE=%s: demo, and says that value is not live', (v) => {
    vi.stubEnv('BELAY_MODE', v);
    expect(modeCell()).toBe(`demo (BELAY_MODE=${v} is not live)`);
  });
});
