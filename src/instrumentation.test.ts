import { afterEach, describe, expect, it, vi } from 'vitest';
import { onRequestError } from './instrumentation';

type Request = Parameters<typeof onRequestError>[1];
type Context = Parameters<typeof onRequestError>[2];
const req = (path: string, method = 'GET'): Request => ({ path, method, headers: {} });
const ctx = (routePath: string, routeType: Context['routeType'] = 'render'): Context => ({
  routerKind: 'App Router',
  routePath,
  routeType,
  renderSource: 'react-server-components',
  revalidateReason: undefined,
});

describe('onRequestError', () => {
  afterEach(() => vi.restoreAllMocks());

  it('logs one belay: line naming the request, the route, the digest and the message', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    onRequestError(Object.assign(new Error('bad snapshot'), { digest: '123' }), req('/fleet'), ctx('/fleet'));
    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith('belay: GET /fleet (route /fleet, render) failed (digest 123): bad snapshot');
  });

  // The route path is the file pattern; only the request names which project, item or task failed, and only the route
  // type and method tell a failed server action (POST, action) from a failed render of the same route.
  it('names the concrete path and the action, never the query string', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    onRequestError(new Error('stage refused'), req('/needs-you/n1?item=promote%3Aledgerline', 'POST'), ctx('/needs-you/[item]', 'action'));
    expect(log).toHaveBeenCalledWith('belay: POST /needs-you/n1 (route /needs-you/[item], action) failed (digest none): stage refused');
  });

  it('copes with a thrown non-error and no digest', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    onRequestError('nope', req('/x'), ctx('/x'));
    expect(log).toHaveBeenCalledWith('belay: GET /x (route /x, render) failed (digest none): nope');
  });
});
