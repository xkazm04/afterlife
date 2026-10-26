import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readConnection } from '../data/connection';
import { ConnectionSection } from './ConnectionSection';

// The rows after Mode: which GitLab, which host and group, for each of the three ways the server can run. The section
// says it never shows a token, so a token in the environment must not reach the markup in any mode.
vi.mock('./StatusLine', () => ({ StatusLine: () => 'status' }));
const TOKEN = 'glpat-not-for-the-page';
const cells = () =>
  Object.fromEntries(
    [...renderToStaticMarkup(createElement(ConnectionSection, { read: readConnection(process.env) })).matchAll(/<th scope="row">([^<]*)<\/th><td[^>]*>([^<]*)<\/td>/g)].map((m) => [m[1], m[2]]),
  );
const run = (env: Record<string, string | undefined>) => {
  for (const [k, v] of Object.entries({ GITLAB_TOKEN: TOKEN, GLAB_TOKEN: TOKEN, ...env })) vi.stubEnv(k, v);
  return renderToStaticMarkup(createElement(ConnectionSection, { read: readConnection(process.env) }));
};

afterEach(() => vi.unstubAllEnvs());

describe('ConnectionSection, the GitLab rows', () => {
  it('demo: no GitLab, no host, no group', () => {
    run({ BELAY_MODE: undefined });
    expect(cells()).toMatchObject({ GitLab: 'not used in demo', Host: 'none', 'Group id': 'none' });
  });
  it('live on the seeded fake: says it is not a real group, and names no host or group', () => {
    run({ BELAY_MODE: 'live', BELAY_GITLAB: 'fake', BELAY_GITLAB_HOST: 'git.example.com', BELAY_GROUP_ID: '77' });
    expect(cells()).toMatchObject({ GitLab: 'seeded fake, not a real group', Host: 'none', 'Group id': 'none' });
  });
  it('live on a real GitLab: the host (gitlab.com when unset, a pasted URL as its hostname) and the group id', () => {
    run({ BELAY_MODE: 'live', BELAY_GITLAB: undefined, BELAY_GITLAB_HOST: undefined, BELAY_GROUP_ID: '42' });
    expect(cells()).toMatchObject({ GitLab: 'real, through the glab login', Host: 'gitlab.com', 'Group id': '42' });
    run({ BELAY_MODE: 'live', BELAY_GITLAB_HOST: 'https://git.example.com/', BELAY_GROUP_ID: '42' });
    expect(cells().Host).toBe('git.example.com');
  });
  it.each([undefined, 'live'])('never puts a token from the environment in the page (BELAY_MODE=%s)', (mode) => {
    expect(run({ BELAY_MODE: mode, BELAY_GROUP_ID: '42' })).not.toContain(TOKEN);
  });
});
