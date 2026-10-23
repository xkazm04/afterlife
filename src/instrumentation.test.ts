import { afterEach, describe, expect, it, vi } from 'vitest';
import { onRequestError } from './instrumentation';

describe('onRequestError', () => {
  afterEach(() => vi.restoreAllMocks());

  it('logs one belay: line naming the route, the digest and the message', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    onRequestError(Object.assign(new Error('bad snapshot'), { digest: '123' }), { path: '/fleet', method: 'GET' }, { routePath: '/fleet' });
    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith('belay: /fleet failed (digest 123): bad snapshot');
  });

  it('copes with a thrown non-error and no digest', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    onRequestError('nope', { path: '/x', method: 'GET' }, { routePath: '/x' });
    expect(log).toHaveBeenCalledWith('belay: /x failed (digest none): nope');
  });
});
